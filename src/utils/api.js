import AsyncStorage from "@react-native-async-storage/async-storage";

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

            // Handle errors from API
            if (!data.success && data.message) {
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
        return this.request("/api/user/update-profile", {
            method: "POST",
            body: JSON.stringify(data),
        });
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

    async bookAppointment(docId, slotDate, slotTime) {
        return this.request("/api/user/book-appointment", {
            method: "POST",
            body: JSON.stringify({ docId, slotDate, slotTime }),
        });
    }

    async cancelAppointment(appointmentId) {
        return this.request("/api/user/cancel-appointment", {
            method: "POST",
            body: JSON.stringify({ appointmentId }),
        });
    }

    // ==================== MOOD TRACKING ENDPOINTS ====================

    async addMoodEntry(userId, moodData) {
        return this.request(`/api/mood-tracking/users/${userId}/mood-entries`, {
            method: "POST",
            body: JSON.stringify(moodData),
        });
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

    // ==================== ASSESSMENTS ENDPOINTS ====================

    async getAssessments() {
        return this.request("/api/assessments", {
            method: "GET",
        });
    }

    async getUserAssessments(userId) {
        return this.request(`/api/assessments/user/${userId}`, {
            method: "GET",
        });
    }

    async submitAssessment(assessmentId, userId, answers) {
        return this.request("/api/assessments/submit", {
            method: "POST",
            body: JSON.stringify({ assessmentId, userId, answers }),
        });
    }

    // ==================== AI CHAT ENDPOINTS ====================

    async sendChatMessage(messages) {
        return this.request("/api/chat/send", {
            method: "POST",
            body: JSON.stringify({ messages }),
        });
    }

    async getChatHistory(userId) {
        return this.request(`/api/chat/history/${userId}`, {
            method: "GET",
        });
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
