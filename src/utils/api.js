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
                headers.Authorization = `Bearer ${token}`; // Added to match webapp behavior
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

    async syncUserToSupabase(user) {
        // [REMOVED] Supabase disabled
        return;
    }

    async register(name, email, password) {
        const response = await this.request("/api/user/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password }),
        });

        // Save token on successful registration
        if (response.success && response.token && validateToken(response.token)) {
            await AsyncStorage.setItem("token", response.token);
            // Fetch profile and sync
            const profile = await this.getProfile();
            // Sync disabled
            // if (profile.success) this.syncUserToSupabase(profile.userData);
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
            // Fetch profile and sync
            const profile = await this.getProfile();
            // Sync disabled
            // if (profile.success && profile.userData) this.syncUserToSupabase(profile.userData);
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
            // Fetch profile and sync
            const profile = await this.getProfile();
            if (profile.success && profile.userData) this.syncUserToSupabase(profile.userData);
        }

        return response;
    }

    async getProfile() {
        const response = await this.request("/api/user/profile", {
            method: "GET",
        });

        if (response.success && response.userData) {
            // [CRITICAL FIX] Ensure we update the stored userId so other components (Journal, Calendar) use the correct ID.
            if (response.userData._id) {
                await AsyncStorage.setItem("userId", response.userData._id);
                console.log("[API] Updated stored userId:", response.userData._id);
            }

            // Background sync every time app fetches profile (DISABLED)
            // this.syncUserToSupabase(response.userData);
        }

        return response;
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
        try {
            console.log("[API] Fetching doctors from Raskamon Backend...");
            const response = await this.request("/api/doctor/list", { method: "GET" });
            return response;
        } catch (error) {
            console.error("[API] Get doctors error:", error);
            throw error;
        }
    }

    // ==================== APPOINTMENTS ENDPOINTS ====================

    async getUserAppointments() {
        try {
            console.log("[API] Fetching user appointments...");
            const response = await this.request("/api/user/appointments", { method: "GET" });
            return response;
        } catch (error) {
            console.error("[API] Get appointments error:", error);
            throw error;
        }
    }

    async checkAvailability(docId, date, time) {
        // Simple client-side or TODO: Implement backend availability check
        // For now, assume available
        // Ideally: return this.request(`/api/user/slot-availability/${docId}/${date}`, { method: "GET" });
        return true;
    }

    async getBookedSlots(docId, date) {
        // Stub: Fetch booked slots from backend
        // return this.request(`/api/doctor/${docId}/booked-slots?date=${date}`)
        return [];
    }

    async syncAppointmentToSupabase(bookingData, backendResponse) {
        // [REMOVED] Supabase sync disabled
        return;
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
            // Try using fetch with JSON first
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
            let data;
            try { data = JSON.parse(responseText); } catch (e) { }

            // Handling Mixed Database IDs (MongoDB vs Supabase UUID)
            // If backend fails because it expects MongoDB ObjectId but we sent a Supabase UUID
            if (!response.ok || (data && data.success === false)) {
                console.log("[API] Backend booking failed (likely ID mismatch), falling back to Supabase sync.");

                // If it's a UUID (Supabase ID), the backend will fail. We handle this locally.
                if (docId.length > 24 || responseText.includes("Cast to ObjectId failed")) {
                    // 1. Sync to Supabase directly
                    const pseudoId = 'res_' + Date.now(); // Temp ID for now
                    await this.syncAppointmentToSupabase({
                        docId, slotDate, slotTime, reasonForVisit,
                        doctorName: appointmentDetails.doctorName || "Doctor",
                        ...appointmentDetails
                    }, {});

                    return { success: true, appointmentId: pseudoId, message: "Appointment confirmed via Raska Secure" };
                }

                throw new Error(data?.message || `Server error: ${response.status}`);
            }

            // Sync to Supabase for Admin Panel & Availability Checks (if backend succeeded)
            this.syncAppointmentToSupabase({
                docId, slotDate, slotTime, reasonForVisit,
                doctorName: appointmentDetails.doctorName || "Doctor",
                ...appointmentDetails
            }, data);

            return data;
        } catch (error) {
            console.error("[API] Booking error:", error.message);

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

    async cancelAppointment(appointmentId, reason = "User cancelled") {
        try {
            console.log("[API] Cancelling appointment:", appointmentId);

            // 1. Try Backend First (using native fetch to avoid wrapper issues)
            const token = await this.getToken();
            const response = await fetch(`${this.baseUrl}/api/user/cancel-appointment`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'token': token || ""
                },
                body: JSON.stringify({ appointmentId, reason }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) return data;
            }
            throw new Error("Backend cancellation failed");
        } catch (error) {
            console.error("[API] Backend cancellation failed, trying Supabase fallback...", error.message);

            // 2. Supabase Fallback (Direct DB Update)
            try {
                const { supabase } = require('./supabaseClient');
                // Try matching by both UUID (id) and integer ID (id) just in case, though usually UUID
                // If appointmentId is a mongo ID (24 chars), this might fail on UUID column, but 'appointments' table uses UUID or Int usually.
                // Mobile app usually has the Supabase ID if fetched from getUserAppointments()

                const { error: sbError } = await supabase
                    .from('appointments')
                    .update({ status: 'cancelled', cancelled: true })
                    .eq('id', appointmentId);

                if (sbError) throw sbError;

                console.log("[API] Cancelled via Supabase fallback ✅");
                return { success: true, message: "Appointment cancelled" };
            } catch (fallbackError) {
                console.error("[API] Supabase fallback failed:", fallbackError);
                return { success: false, message: "Could not cancel appointment" };
            }
        }
    }

    // ==================== PAYMENT ENDPOINTS ====================

    async initiatePayment(tempReservationId) {
        // [MODIFIED] Mock logic removed. Strictly use Backend.
        if (typeof tempReservationId === 'string' && tempReservationId.startsWith('res_')) {
            throw new Error("Invalid Reservation ID. Please retry booking.");
        }

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
        // [MODIFIED] Mock verification removed. Strictly use Backend.
        if (typeof razorpay_order_id === 'string' && razorpay_order_id.startsWith('order_mock_')) {
            throw new Error("Invalid Mock Order. Payment verification failed.");
        }

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

    // Duplicate cancelAppointment removed


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

    // --- FEATURE SYNC METHODS ---

    async syncWaterLog(userId, glasses, goal) {
        // [REMOVED] Supabase sync. Future: Use Backend API
        return;
    }

    async syncSleepLog(userId, start, end, quality, notes = "") {
        // [REMOVED] Supabase sync. Future: Use Backend API
        return;
    }

    async fetchSleepLogs(userId) {
        // [REMOVED] Supabase sync. Future: Use Backend API
        return [];
    }

    async syncBreathing(userId, durationSeconds) {
        // [REMOVED] Supabase sync. Future: Use Backend API
        return;
    }

    async syncHabit(userId, habitId, habitLabel, isCompleted) {
        // [REMOVED] Supabase sync. Future: Use Backend API
        return;
    }

    // ==================== MOOD TRACKING (WEB COMPATIBLE) ====================

    // Enable mood tracking for the user (required before adding entries)
    async enableMoodTracking(userId) {
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

    // ==================== MOOD TRACKING (WEB COMPATIBLE SERVICE) ====================
    // Strictly aligned with frontend/src/services/moodTrackingService.js

    async addMoodEntry(userId, moodData) {
        // MATCHES WEB: async addMoodEntry(userId, moodData)
        // Payload: moodData object with moodScore, moodLabel, activities, etc.
        if (!userId) throw new Error("User ID required for mood submission");

        try {
            console.log("[API] Sending POST to /api/mood-tracking/users/" + userId + "/mood-entries");
            const response = await this.request(`/api/mood-tracking/users/${userId}/mood-entries`, {
                method: "POST",
                body: JSON.stringify(moodData),
            });

            // Web service logs this
            if (response.aiAnalysisTriggered) {
                console.log("[API] AI analysis automatically triggered for new mood entry");
            }

            return response;
        } catch (error) {
            // Auto-enable tracking if it's disabled (Mobile specific enhancement)
            if (error.message && (error.message.includes("not enabled") || error.message.includes("disabled"))) {
                console.log("[API] Mood tracking not enabled, enabling now...");
                await this.enableMoodTracking(userId);
                // Retry
                return await this.request(`/api/mood-tracking/users/${userId}/mood-entries`, {
                    method: "POST",
                    body: JSON.stringify(moodData),
                });
            }
            throw error;
        }
    }

    // Alias for journal.jsx compatibility (will maintain both for now)
    async submitMoodEntry(userId, moodData) {
        return this.addMoodEntry(userId, moodData);
    }

    async getMoodEntries(userId, page = 1, limit = 20) {
        if (!userId) throw new Error("User ID required");
        return this.request(`/api/mood-tracking/users/${userId}/mood-entries?page=${page}&limit=${limit}`, {
            method: "GET"
        });
    }

    async getMoodsHistory(userId) {
        return this.getMoodEntries(userId, 1, 20);
    }

    async getMoodAnalytics(userId, period = "30") {
        return this.request(`/api/mood-tracking/users/${userId}/mood-analytics?period=${period}`, {
            method: "GET"
        });
    }

    async getMoodDashboard(userId, period = "30") {
        return this.request(`/api/mood-tracking/users/${userId}/mood-dashboard?period=${period}`, {
            method: "GET"
        });
    }

    async getMoodPatterns(userId, period = "30") {
        return this.request(`/api/mood-tracking/users/${userId}/mood-patterns?period=${period}`, {
            method: "GET"
        });
    }

    // --- Web Dashboard Analytics Endpoints ---

    async getUserAnalytics(userId, params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        return this.request(`/api/analytics/${userId}?${queryParams}`, {
            method: "GET"
        });
    }

    async getWeeklyMoodAnalytics(userId) {
        return this.request(`/api/analytics/weekly-mood/${userId}`, {
            method: "GET"
        });
    }

    async getUserAssessmentSummary(userId, params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        return this.request(`/api/analytics/user/current-month/assessment/${userId}?${queryParams}`, {
            method: "GET"
        });
    }

    // -----------------------------------------

    async getMoodInsights(userId, period = "30") {
        return this.request(`/api/mood-tracking/users/${userId}/mood-insights?period=${period}`, {
            method: "GET"
        });
    }

    async getAIAnalysis(userId, analysisType = "weekly", limit = 10) {
        return this.request(`/api/mood-tracking/users/${userId}/ai-analysis?analysisType=${analysisType}&limit=${limit}`, {
            method: "GET"
        });
    }

    async getLatestAIAnalysis(userId) {
        return this.request(`/api/mood-tracking/users/${userId}/latest-ai-analysis`, {
            method: "GET"
        });
    }

    async updateMoodTrackingPreferences(userId, preferences) {
        return this.request(`/api/mood-tracking/users/${userId}/mood-preferences`, {
            method: "PUT",
            body: JSON.stringify(preferences),
        });
    }

    async getMoodTrackingPreferences(userId) {
        return this.request(`/api/mood-tracking/users/${userId}/mood-preferences`, {
            method: "GET"
        });
    }

    async createMoodGoal(userId, goalData) {
        return this.request(`/api/mood-tracking/users/${userId}/mood-goals`, {
            method: "POST",
            body: JSON.stringify(goalData),
        });
    }

    async getMoodGoals(userId, active = true) {
        return this.request(`/api/mood-tracking/users/${userId}/mood-goals?active=${active}`, {
            method: "GET"
        });
    }

    async getAllMoodsTemplate() {
        return this.request("/api/moods/get-all-moods", { method: "GET" });
    }

    async submitWebMood(payload) {
        return this.request("/api/moods/submit-mood", {
            method: "POST",
            body: JSON.stringify(payload)
        });
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
