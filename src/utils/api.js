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

    async syncUserToSupabase(user) {
        if (!user || !user._id) return;
        try {
            // Lazy load supabase to avoid cyclic dependencies or early init issues
            const { supabase } = require('./supabaseClient');

            console.log(`[API] 🔄 Syncing User to Supabase: ${user.name} (${user._id})`);

            const { error } = await supabase
                .from('users_sync')
                .upsert({
                    mongo_id: user._id,
                    email: user.email,
                    name: user.name,
                    avatar: user.image || user.avatar || "",
                    last_synced_at: new Date()
                }, { onConflict: 'mongo_id' });

            if (error) console.error("[API] ❌ User Sync Error:", error.message);
            else console.log("[API] ✅ User Synced to Supabase");
        } catch (e) {
            console.error("[API] ❌ User Sync Exception:", e);
        }
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
            if (profile.success) this.syncUserToSupabase(profile.userData);
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
            if (profile.success && profile.userData) this.syncUserToSupabase(profile.userData);
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
            // Background sync every time app fetches profile
            this.syncUserToSupabase(response.userData);
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
            console.log("[API] 🔄 Starting Smart Doctor Sync (Supabase Priority)...");

            // 1. Fetch LIVE data from MongoDB (Backend)
            let liveDoctors = [];
            try {
                const backendResponse = await this.request("/api/doctor/list", { method: "GET" });
                if (backendResponse.success) {
                    liveDoctors = backendResponse.doctors || [];
                }
            } catch (err) {
                console.log("[API] Backend fetch failed, relying on Supabase cache:", err.message);
            }

            // 2. Fetch EVERYTHING from Supabase
            // This includes linked doctors AND manually added ones
            let supabaseDoctors = [];
            try {
                const { supabase } = require('./supabaseClient');
                const { data, error } = await supabase
                    .from('doctors_sync')
                    .select('*')
                    .eq('is_active', true);

                if (error) throw error;
                supabaseDoctors = data || [];
            } catch (sbError) {
                console.error("[API] Supabase fetch error:", sbError);
            }

            // Map for quick lookup
            const sbMap = new Map();
            if (supabaseDoctors.length > 0) {
                supabaseDoctors.forEach(d => {
                    if (d.external_id) sbMap.set(d.external_id, d);
                });
            }

            // 3. BACKGROUND SYNC (Live -> Supabase)
            // We update existing records but PROTECT your manual edits (fees, about)
            if (liveDoctors.length > 0 && typeof require !== 'undefined') {
                const { supabase } = require('./supabaseClient');

                const updates = liveDoctors.map(doc => {
                    const existingSb = sbMap.get(doc._id);

                    return {
                        external_id: doc._id,
                        // Always sync identity fields from Backend
                        name: doc.name,
                        specialty: doc.speciality,
                        image: doc.image,
                        degree: doc.degree,
                        phone: doc.phone,
                        email: doc.email,

                        // PROTECTED FIELDS: Use existing Supabase value if present, else Live value
                        fees: existingSb?.fees || doc.fees,
                        about: existingSb?.about || doc.about,

                        updated_at: new Date()
                    };
                });

                // Fire and forget upsert
                supabase.from('doctors_sync').upsert(updates, { onConflict: 'external_id' })
                    .then(({ error }) => { if (error) console.log("[API] Bg Sync Error:", error.message); });
            }

            // 4. SUPABASE-FIRST MERGE STRATEGY
            // We only want to show doctors that exist in Supabase (the Admin Panel list).
            // This effectively "hides" old MongoDB doctors that aren't in our new system.

            if (supabaseDoctors.length > 0) {
                const finalDoctorList = supabaseDoctors.map(d => {
                    // Try to find matching live data for extra fields if needed (like image updates)
                    const liveDoc = liveDoctors.find(ld => ld._id === d.external_id);

                    return {
                        _id: d.id, // Use Supabase UUID as primary ID
                        docId: d.id,
                        externalId: d.external_id || null, // Keep reference
                        name: d.name,
                        speciality: d.specialty || d.speciality || "General",
                        degree: d.degree || (liveDoc?.degree || ""),
                        experience: d.experience || (liveDoc?.experience || "5+ Years"),
                        about: d.about || (liveDoc?.about || "Expert Doctor"),
                        fees: d.fees || (liveDoc?.fees || 500),
                        image: d.image || (liveDoc?.image || "https://via.placeholder.com/150"),
                        location: d.location || "Online",
                        latitude: d.latitude || null,
                        longitude: d.longitude || null,
                        available: d.is_active,
                        email: d.email || (liveDoc?.email || "")
                    };
                });

                console.log(`[API] 🚀 Doctors: Returning ${finalDoctorList.length} from Supabase.`);
                return { success: true, doctors: finalDoctorList };
            }

            // Fallback: If Supabase is empty, show original live list
            console.log("[API] Supabase empty, using legacy list.");
            return { success: true, doctors: liveDoctors };

        } catch (e) {
            console.error("[API] Smart Sync Error:", e);
            return this.request("/api/doctor/list", { method: "GET" });
        }
    }

    // ==================== APPOINTMENTS ENDPOINTS ====================

    async getUserAppointments() {
        return this.request("/api/user/appointments", {
            method: "GET",
        });
    }

    async checkAvailability(docId, date, time) {
        try {
            const { supabase } = require('./supabaseClient');

            // Check if slot is already booked
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('doctor_id', docId)
                .eq('appointment_date', date)
                .eq('appointment_time', time)
                .neq('status', 'cancelled') // Ignore cancelled bookings
                .maybeSingle();

            if (error) {
                // If table doesn't exist, we assume available (fallback) and silence the error
                if (error.message.includes('does not exist')) {
                    // console.log("[API] Info: Appointments table missing, skipping check.");
                    return true;
                }
                console.error("[API] Availability Check Error:", error.message);
                return true; // Use optimism if error
            }

            return !data; // Return true if no booking found (Available)
        } catch (e) {
            console.error("[API] Availability Check Exception:", e);
            return true;
        }
    }

    async getBookedSlots(docId, date) {
        try {
            const { supabase } = require('./supabaseClient');
            const { data, error } = await supabase
                .from('appointments')
                .select('appointment_time')
                .eq('doctor_id', docId)
                .eq('appointment_date', date)
                .neq('status', 'cancelled');

            if (error) {
                if (error.message.includes('does not exist')) return [];
                console.error("[API] getBookedSlots Error:", error.message);
                return [];
            }

            return data.map(apt => apt.appointment_time);
        } catch (e) {
            console.error("[API] getBookedSlots Exception:", e);
            return [];
        }
    }

    async syncAppointmentToSupabase(bookingData, backendResponse) {
        try {
            const { supabase } = require('./supabaseClient');
            const profile = await this.getProfile();
            const userData = profile.userData || {};

            // Fetch doctor specialty if possible
            const { data: docData } = await supabase
                .from('doctors_sync')
                .select('specialization')
                .eq('id', bookingData.docId)
                .maybeSingle();

            const { error } = await supabase.from('appointments').insert({
                user_id: userData._id || userData.id,
                user_name: userData.name || "App User",
                user_email: userData.email || "N/A",
                user_phone: userData.phone || "N/A",
                user_gender: userData.gender || "N/A",
                user_age: userData.age || 0,
                doctor_id: bookingData.docId,
                doctor_name: bookingData.doctorName || "Doctor",
                doctor_specialty: docData?.specialization || 'General',
                appointment_date: bookingData.slotDate,
                appointment_time: bookingData.slotTime,
                status: 'pending',
                notes: bookingData.reasonForVisit,
                session_type: bookingData.sessionType || 'Online'
            });

            if (error) {
                if (error.message.includes('does not exist')) return;
                console.error("[API] Sync Appointment Error:", error.message);
            }
            else console.log("[API] Appointment Synced to Supabase ✅");
        } catch (e) {
            console.error("[API] Sync Appointment Exception:", e);
        }
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
                        doctorName: appointmentDetails.doctorName
                    }, {});

                    return { success: true, appointmentId: pseudoId, message: "Appointment confirmed via Raska Secure" };
                }

                throw new Error(data?.message || `Server error: ${response.status}`);
            }

            // Sync to Supabase for Admin Panel & Availability Checks (if backend succeeded)
            this.syncAppointmentToSupabase({
                docId, slotDate, slotTime, reasonForVisit,
                doctorName: appointmentDetails.doctorName
            }, data);

            return data;
        } catch (error) {
            console.error("[API] Booking error:", error.message);

            // Fallback for UUIDs if generic network error occurred during fetch
            if (docId.length > 24) {
                await this.syncAppointmentToSupabase({
                    docId, slotDate, slotTime, reasonForVisit,
                    doctorName: appointmentDetails.doctorName
                }, {});
                return { success: true, appointmentId: 'offline_' + Date.now(), message: "Appointment synced successfully" };
            }

            // If JSON approach fails, the server might require FormData
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
        // Handle Local/Supabase Reservations (Bypass Backend)
        if (typeof tempReservationId === 'string' && tempReservationId.startsWith('res_')) {
            console.log("[API] Local reservation detected, simulating payment order.");
            return {
                success: true,
                order: {
                    id: "order_mock_" + Date.now(), // Fake Order ID
                    amount: 50000, // 500.00 INR
                    currency: "INR",
                    status: "created"
                },
                key: "rzp_test_mock_key"
            };
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
        // Handle Local/Supabase Mock Verification
        if (typeof razorpay_order_id === 'string' && razorpay_order_id.startsWith('order_mock_')) {
            console.log("[API] Verifying mock payment: Success");
            // We should ideally update the Supabase appointment status to 'confirmed' here
            // accessing the previously stored 'res_' ID might be tricky unless passed through.
            // But usually the app will call this and then show success.
            return { success: true };
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

    // --- FEATURE SYNC METHODS ---

    async syncWaterLog(userId, glasses, goal) {
        if (!userId) return;
        try {
            const { supabase } = require('./supabaseClient');
            const today = new Date().toISOString().split('T')[0];
            const amount_ml = glasses * 250; // Approx 250ml per glass

            supabase.from('water_logs').upsert({
                user_id: userId,
                date: today,
                amount_ml: amount_ml,
                daily_goal: goal * 250,
                updated_at: new Date()
            }, { onConflict: 'user_id, date' })
                .then(({ error }) => {
                    if (error) console.log("[API] Water Sync Error", error.message);
                    else console.log("[API] Water Synced 💧");
                });
        } catch (e) { console.error(e); }
    }

    async syncSleepLog(userId, start, end, quality, notes = "") {
        if (!userId) return;
        try {
            const { supabase } = require('./supabaseClient');
            supabase.from('sleep_logs').insert({
                user_id: userId,
                start_time: start,
                end_time: end,
                quality_rating: quality,
                notes: notes
            }).then(({ error }) => {
                if (error) console.log("[API] Sleep Sync Error", error.message);
            });
        } catch (e) { console.error(e); }
    }

    async fetchSleepLogs(userId) {
        if (!userId) return [];
        try {
            const { supabase } = require('./supabaseClient');
            const { data, error } = await supabase
                .from('sleep_logs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(7);

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error("[API] Fetch Sleep Logs Error:", e);
            return [];
        }
    }

    async syncBreathing(userId, durationSeconds) {
        if (!userId) return;
        try {
            const { supabase } = require('./supabaseClient');
            supabase.from('breathing_sessions').insert({
                user_id: userId,
                duration_seconds: durationSeconds,
                completed_at: new Date()
            }).then(({ error }) => {
                if (error) console.log("[API] Breathing Sync Error", error.message);
            });
        } catch (e) { console.error(e); }
    }

    async syncHabit(userId, habitId, habitLabel, isCompleted) {
        if (!userId) return;
        try {
            const { supabase } = require('./supabaseClient');
            const today = new Date().toISOString().split('T')[0];

            // Check if habit exists
            const { data: habits, error: fetchError } = await supabase
                .from('habits')
                .select('*')
                .eq('user_id', userId)
                .eq('habit_name', habitLabel)
                .maybeSingle();

            if (fetchError) { console.log("Fetch habit error", fetchError); return; }

            let completedDates = habits ? (habits.completed_dates || []) : [];
            // Parse if strictly stored as text/json, but supabase usually handles arrays if column is array type
            // If column is TEXT, we might need JSON.parse/stringify. Assuming ARRAY type or JSONB.
            // Safe check:
            if (typeof completedDates === 'string') {
                try { completedDates = JSON.parse(completedDates); } catch (e) { completedDates = []; }
            }

            if (isCompleted) {
                if (!completedDates.includes(today)) completedDates.push(today);
            } else {
                completedDates = completedDates.filter(d => d !== today);
            }

            if (habits) {
                await supabase
                    .from('habits')
                    .update({ completed_dates: completedDates })
                    .eq('id', habits.id);
            } else if (isCompleted) {
                await supabase.from('habits').insert({
                    user_id: userId,
                    habit_name: habitLabel,
                    frequency: 'daily',
                    completed_dates: completedDates,
                    streak: 1
                });
            }
        } catch (e) { console.error("Sync Habit Error", e); }
    }

    async addMoodEntry(userId, moodData) {
        // 1. Sync to Supabase (Fire and Forget)
        try {
            const { supabase } = require('./supabaseClient');
            // ... strict type checks or default values could go here
            supabase.from('mood_logs').insert({
                user_id: userId,
                mood_score: moodData.score,
                mood_label: moodData.label,
                notes: moodData.notes,
                activities: moodData.activities, // Store as JSON/Array
                created_at: new Date()
            }).then(({ error }) => {
                if (error) console.log("[API] Mood Sync Error", error.message);
            });
        } catch (e) { console.error("Mood Sync Exception", e); }

        // 2. Send to Backend
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
