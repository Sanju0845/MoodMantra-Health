import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// Backend URL - same as the webapp
const API_BASE_URL = "https://backend.raskamon.com";

/**
 * Validate token format (basic JWT validation)
 */
const validateToken = (token) => {
    if (!token) return false;
    const parts = token.split('.');
    return parts.length === 3;
};

class API {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    async getToken() {
        try {
            const token = await AsyncStorage.getItem("token");
            return validateToken(token) ? token : null;
        } catch (error) {
            console.error("[API] Error getting token:", error);
            return null;
        }
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        try {
            const token = await this.getToken();

            const headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                ...options.headers,
            };

            // Add token to headers if available (matching webapp's pattern)
            if (token) {
                headers.token = token;
            }

            const config = {
                ...options,
                headers,
            };

            console.log(`[API] ${options.method || 'GET'} ${endpoint}`);

            const response = await fetch(url, config);

            // Get response text first
            const responseText = await response.text();

            // Try to parse as JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error("[API] Failed to parse response:", responseText.substring(0, 200));
                throw new Error("Invalid response from server");
            }

            console.log(`[API] Response status: ${response.status}, success: ${data.success}`);

            // Handle errors from API - only throw if success is explicitly false
            // Some endpoints don't have a success field but still succeed (like mood tracking)
            if (data.success === false && data.message) {
                throw new Error(data.message);
            }

            // If response status is 4xx or 5xx and we have a message, throw error
            if (!response.ok && data.message) {
                throw new Error(data.message);
            }

            return data;
        } catch (error) {
            // Network errors
            if (error.message === "Network request failed") {
                console.error("[API] Network error");
                throw new Error("Network error. Please check your internet connection.");
            }

            console.error("[API] Error:", error.message);
            throw error;
        }
    }

    // ==================== AUTH ENDPOINTS ====================

    async register(name, email, password) {
        const response = await this.request("/api/user/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password }),
        });

        // Save token on successful registration
        if (response.success && response.token && validateToken(response.token)) {
            await AsyncStorage.setItem("token", response.token);
        }

        return response;
    }

    async login(email, password) {
        const response = await this.request("/api/user/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });

        // Save token on successful login
        if (response.success && response.token && validateToken(response.token)) {
            await AsyncStorage.setItem("token", response.token);
        }

        return response;
    }

    async googleLogin(idToken) {
        const response = await this.request("/api/user/google-login", {
            method: "POST",
            body: JSON.stringify({ idToken }),
        });

        if (response.success && response.token && validateToken(response.token)) {
            await AsyncStorage.setItem("token", response.token);
        }

        return response;
    }

    async getProfile() {
        return this.request("/api/user/profile", {
            method: "GET",
        });
    }

    async updateProfile(data) {
        const token = await this.getToken();
        const url = `${this.baseUrl}/api/user/update-profile`;

        // Backend expects FormData (multipart/form-data) due to upload middleware
        const formData = new FormData();
        formData.append("name", data.name || "");
        formData.append("phone", data.phone || "");
        formData.append("address", JSON.stringify(data.address || {}));
        formData.append("gender", data.gender || "");
        formData.append("dob", data.dob || "");

        // If there's an image, it would be appended here
        // formData.append("image", imageFile);

        const headers = {};
        if (token) {
            headers.token = token;
        }

        console.log("[API] PUT /api/user/update-profile with FormData");

        try {
            const response = await fetch(url, {
                method: "PUT",
                headers,
                body: formData,
            });

            const responseData = await response.json();
            console.log("[API] Update profile response:", responseData.success);
            return responseData;
        } catch (error) {
            console.error("[API] Update profile error:", error);
            throw error;
        }
    }

    // ==================== DOCTORS ENDPOINTS ====================

    async getDoctors() {
        return this.request("/api/doctor/list", {
            method: "GET",
        });
    }

    // ==================== APPOINTMENTS ENDPOINTS ====================

    async getUserAppointments() {
        return this.request("/api/user/appointments", {
            method: "GET",
        });
    }

    async bookAppointment(docId, slotDate, slotTime, appointmentDetails = {}) {
        const {
            reasonForVisit = "General Consultation",
            sessionType = "Online",
            communicationMethod = "Zoom", // Valid values: "Zoom", "Google Meet", "Phone Call"
            consentGiven = true,
        } = appointmentDetails;

        const token = await AsyncStorage.getItem("token");

        // Build request body as JSON
        const requestBody = {
            docId,
            slotDate,
            slotTime,
            reasonForVisit,
            sessionType,
            communicationMethod: sessionType === "Online" ? communicationMethod : undefined,
            briefNotes: "",
            consentGiven: consentGiven.toString(),
            chatSummary: "Mobile app booking",
            emergencyContact: {
                name: "",
                phone: "",
                relationship: "",
            }
        };

        console.log("[API] Booking appointment:", { docId, slotDate, slotTime, reasonForVisit, sessionType });

        try {
            // Try using fetch with JSON first (simpler and more reliable on mobile)
            const response = await fetch(`${this.baseUrl}/api/user/book-appointment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'token': token || "",
                },
                body: JSON.stringify(requestBody),
            });

            const responseText = await response.text();
            console.log("[API] Booking response status:", response.status);
            console.log("[API] Booking response:", responseText.substring(0, 500));

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error("[API] Failed to parse booking response");
                throw new Error("Invalid server response");
            }

            if (!response.ok || data.success === false) {
                throw new Error(data.message || `Server error: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error("[API] Booking error:", error.message);

            // If JSON approach fails, the server might require FormData
            // This could happen with some backend configurations
            if (error.message.includes("Required fields") || error.message.includes("multipart")) {
                console.log("[API] Retrying with FormData...");
                return this.bookAppointmentWithFormData(docId, slotDate, slotTime, appointmentDetails);
            }

            throw new Error(error.message || "Failed to book appointment");
        }
    }

    // Fallback method using FormData if JSON doesn't work
    async bookAppointmentWithFormData(docId, slotDate, slotTime, appointmentDetails = {}) {
        const {
            reasonForVisit = "General Consultation",
            sessionType = "Online",
            communicationMethod = "Zoom",
            consentGiven = true,
        } = appointmentDetails;

        const token = await AsyncStorage.getItem("token");

        const formData = new FormData();
        formData.append("docId", docId);
        formData.append("slotDate", slotDate);
        formData.append("slotTime", slotTime);
        formData.append("reasonForVisit", reasonForVisit);
        formData.append("sessionType", sessionType);

        if (sessionType === "Online") {
            formData.append("communicationMethod", communicationMethod);
        }

        formData.append("briefNotes", "");
        formData.append("consentGiven", String(consentGiven));
        formData.append("chatSummary", "Mobile app booking");
        formData.append("emergencyContact[name]", "");
        formData.append("emergencyContact[phone]", "");
        formData.append("emergencyContact[relationship]", "");

        const response = await fetch(`${this.baseUrl}/api/user/book-appointment`, {
            method: 'POST',
            headers: {
                'token': token || "",
                // Don't set Content-Type for FormData
            },
            body: formData,
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
            throw new Error(data.message || "Failed to book appointment");
        }

        return data;
    }

    // ==================== PAYMENT ENDPOINTS ====================

    async initiatePayment(tempReservationId) {
        const token = await this.getToken();

        console.log("[API] Initiating payment for reservation:", tempReservationId);

        try {
            const response = await fetch(`${this.baseUrl}/api/user/payment-razorpay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'token': token || "",
                },
                body: JSON.stringify({ tempReservationId }),
            });

            const data = await response.json();
            console.log("[API] Payment initiation response:", data.success);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || "Failed to initiate payment");
            }

            return data;
        } catch (error) {
            console.error("[API] Payment initiation error:", error);
            throw error;
        }
    }

    async verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature) {
        const token = await this.getToken();

        console.log("[API] Verifying payment:", { razorpay_order_id });

        try {
            const response = await fetch(`${this.baseUrl}/api/user/verify-razorpay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'token': token || "",
                },
                body: JSON.stringify({
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature,
                }),
            });

            const data = await response.json();
            console.log("[API] Payment verification response:", data.success);

            if (!response.ok || data.success === false) {
                throw new Error(data.message || "Payment verification failed");
            }

            return data;
        } catch (error) {
            console.error("[API] Payment verification error:", error);
            throw error;
        }
    }

    async cancelPayment(tempReservationId) {
        const token = await this.getToken();

        console.log("[API] Cancelling payment for reservation:", tempReservationId);

        try {
            const response = await fetch(`${this.baseUrl}/api/user/cancel-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'token': token || "",
                },
                body: JSON.stringify({ tempReservationId }),
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("[API] Cancel payment error:", error);
            // Don't throw - this is a cleanup operation
            return { success: false };
        }
    }

    async cancelAppointment(appointmentId) {
        return this.request("/api/user/cancel-appointment", {
            method: "POST",
            body: JSON.stringify({ appointmentId }),
        });
    }

    // ==================== MOOD TRACKING ENDPOINTS ====================

    async enableMoodTracking(userId) {
        // Enable mood tracking for the user (required before adding entries)
        const preferences = {
            enabled: true,
            frequency: "daily",
            aiAnalysisConsent: false,
            aiAnalysisLevel: "basic",
            privacySettings: {
                shareWithTherapist: false,
                shareWithFamily: false,
                anonymousDataSharing: false,
            },
            notificationPreferences: {
                moodReminders: true,
                weeklyInsights: true,
                crisisAlerts: true,
                therapistNotifications: false,
            },
        };

        return this.request(`/api/mood-tracking/users/${userId}/mood-preferences`, {
            method: "PUT",
            body: JSON.stringify(preferences),
        });
    }

    async addMoodEntry(userId, moodData) {
        try {
            return await this.request(`/api/mood-tracking/users/${userId}/mood-entries`, {
                method: "POST",
                body: JSON.stringify(moodData),
            });
        } catch (error) {
            // If mood tracking is not enabled, enable it and retry
            if (error.message.includes("not enabled")) {
                console.log("[API] Mood tracking not enabled, enabling now...");
                await this.enableMoodTracking(userId);
                // Retry the mood entry
                return await this.request(`/api/mood-tracking/users/${userId}/mood-entries`, {
                    method: "POST",
                    body: JSON.stringify(moodData),
                });
            }
            throw error;
        }
    }

    async getMoodEntries(userId, page = 1, limit = 10) {
        return this.request(
            `/api/mood-tracking/users/${userId}/mood-entries?page=${page}&limit=${limit}`,
            { method: "GET" }
        );
    }

    async getMoodAnalytics(userId, period = 30) {
        return this.request(
            `/api/mood-tracking/users/${userId}/mood-analytics?period=${period}`,
            { method: "GET" }
        );
    }

    async getMoodDashboard(userId, period = 30) {
        return this.request(
            `/api/mood-tracking/users/${userId}/mood-dashboard?period=${period}`,
            { method: "GET" }
        );
    }

    async getMoodCalendar(userId, year, month) {
        // Get all mood entries for a specific month
        return this.request(
            `/api/mood-tracking/users/${userId}/mood-entries?year=${year}&month=${month}&limit=100`,
            { method: "GET" }
        );
    }

    // ==================== ASSESSMENTS ENDPOINTS ====================

    async getAssessments(therapyType = "individual") {
        return this.request(`/api/assessments?therapyType=${therapyType}`, {
            method: "GET",
        });
    }

    async getAssessmentById(assessmentId) {
        return this.request(`/api/assessments/${assessmentId}`, {
            method: "GET",
        });
    }

    async getUserAssessments(userId) {
        return this.request(`/api/assessments/user/${userId}`, {
            method: "GET",
        });
    }

    async submitAssessment(assessmentData) {
        const {
            userId,
            assessmentId,
            title,
            answers,
            therapyType = "individual",
            startTime,
        } = assessmentData;

        return this.request("/api/assessments/submit", {
            method: "POST",
            body: JSON.stringify({
                userId,
                assessmentId,
                title,
                answers,
                therapyType,
                startTime,
            }),
        });
    }

    // ==================== AI CHAT ENDPOINTS ====================

    async sendChatMessage(message, userId) {
        const token = await this.getToken();
        const url = `${this.baseUrl}/api/chat/send`;

        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        // Match web app's payload format
        const payload = userId
            ? { message, userId }
            : { message };

        console.log("[API] POST /api/chat/send", payload);

        try {
            const response = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            console.log("[API] Chat response:", data.success);
            return data;
        } catch (error) {
            console.error("[API] Chat error:", error);
            throw error;
        }
    }

    async getChatHistory(userId) {
        if (!userId) {
            return { success: false, messages: [] };
        }

        const token = await this.getToken();
        const url = `${this.baseUrl}/api/chat?userId=${userId}`;

        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                method: "GET",
                headers,
            });

            const data = await response.json();
            return {
                success: true,
                messages: data.chat?.messages || []
            };
        } catch (error) {
            console.error("[API] Get chat history error:", error);
            return { success: false, messages: [] };
        }
    }

    // ==================== NOTIFICATIONS ENDPOINTS ====================

    async getNotifications(userId) {
        return this.request(`/api/notifications/user/${userId}`, {
            method: "GET",
        });
    }

    async markNotificationRead(notificationId) {
        return this.request(`/api/notifications/${notificationId}/read`, {
            method: "PUT",
        });
    }

    // ==================== BLOG ENDPOINTS ====================

    async getBlogPosts() {
        return this.request("/api/blog-posts", {
            method: "GET",
        });
    }

    async getBlogPost(slug) {
        return this.request(`/api/blog-posts/${slug}`, {
            method: "GET",
        });
    }

    // ==================== TESTIMONIALS ENDPOINTS ====================

    async getTestimonials() {
        return this.request("/api/testimonials", {
            method: "GET",
        });
    }

    // ==================== LOGOUT ====================

    async logout() {
        try {
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("userId");
            console.log("[API] Logged out, tokens cleared");
        } catch (error) {
            console.error("[API] Logout error:", error);
        }
    }
}

export default new API();
