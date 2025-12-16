# Raskamon App - Comprehensive Feature & API Specification for Build

This document serves as a "Mega Prompt" to build or update the **Raskamon** application. It incorporates all features, logic, and API endpoints from the latest web backend specifications (`moodmantra-main`), ensuring full parity between the web and mobile experiences.

## 1. App Overview
**Raskamon** is a mental health platform connecting users with therapists and providing advanced self-care tools like AI-powered mood tracking.

**Tech Stack Requirements:**
- **Frontend:** React Native (Expo)
- **Backend:** Node.js / Express (Existing: `https://backend.raskamon.com`)
- **Database:** MongoDB
- **Authentication:** JWT & Google OAuth

---

## 2. Authentication & User Management
**Features:**
- **Login/Register:** Email & Password authentication.
- **Google OAuth:** Native Google Sign-In integration.
- **Profile Management:** Update personal details (image, phone, bio).
- **JWT Fix:** Ensure `userId` is consistently stored in `AsyncStorage` upon login/profile fetch to prevent data mismatch.

**API Endpoints:**
- `POST /api/user/register` - Register new user.
- `POST /api/user/login` - Login user.
- `POST /api/user/google-auth` - Google OAuth authentication.
- `GET /api/user/profile` - Get current user profile.
- `POST /api/user/update-profile` - Update user profile.

---

## 3. Doctor Appointment System (Razorpay Integration)
**Features:**
- **Find Doctors:** List doctors filtering by specialty and availability.
- **Appointment Booking (New Flow):** 
  1. **Temporary Reservation:** User selects slot -> Temporary reservation (15 min expiry).
  2. **Payment:** User pays via Razorpay using `tempReservationId`.
  3. **Confirmation:** On success, backend converts reservation to confirmed appointment.
- **Slot Management:** Real-time availability check, excluding "pending" or "paid" slots.

**API Endpoints:**
- `GET /api/doctor/list` - Get all doctors.
- `GET /api/user/slot-availability/:docId/:slotDate` - Check slot availability.
- `POST /api/user/book-appointment` - Create temporary reservation.
- `POST /api/user/payment-razorpay` - Initiate payment for reservation.
- `POST /api/user/verify-razorpay` - Verify payment & confirm appointment.
- `POST /api/user/cancel-payment` - Cancel payment & release slot.
- `GET /api/user/appointments` - List user's appointments.

---

## 4. AI-Powered Mood Tracking & Dashboard
**Features:**
- **Mood Logging:** Log mood (Score 1-5), label (Happy, Sad, etc.), and activities (strictly mapped backend enums: `exercise`, `work`, `social`, etc.).
- **Mood Dashboard:**
  - **Overview:** Average score, total entries, trend indicators.
  - **Charts:** Line chart for trends, bar chart for mood distribution.
  - **Period:** Filter by 7, 30, or 90 days.
- **AI Analysis:**
  - **Weekly Report:** Pattern recognition, triggers, positive activities.
  - **Risk Assessment:** Crisis detection and warnings.
  - **Recommendations:** Personalized advice based on mood history.
- **Goals:** Set and track mood improvement goals (streaks, targets).

**API Endpoints:**
- `POST /api/mood-tracking/users/:userId/mood-entries` - Submit mood entry.
- `GET /api/mood-tracking/users/:userId/mood-entries` - Get recent entries.
- `GET /api/mood-tracking/users/:userId/mood-dashboard?period=30` - Get full dashboard stats.
- `GET /api/mood-tracking/users/:userId/mood-patterns` - Get pattern analysis.
- `GET /api/mood-tracking/users/:userId/mood-insights` - Get AI insights.
- `GET /api/mood-tracking/users/:userId/ai-analysis` - Get detailed AI analysis report.
- `POST /api/mood-tracking/users/:userId/mood-goals` - Create mood goal.
- `GET /api/mood-tracking/users/:userId/mood-goals` - Get active goals.
- `PUT /api/mood-tracking/users/:userId/mood-preferences` - Update tracking settings.

---

## 5. Doctor Portal: Patient Mood Data
**Features:**
- **View Patient Data:** Doctors can view mood analytics for their patients.
- **Privacy:** Requires patient consent (toggle in user settings).
- **Analytics:** Doctors see average mood, trends, and recent logs during sessions.

**API Endpoints:**
- `GET /api/doctor/patient-mood-data?patientId=...` - (Doctor Only) Get patient mood data.

---

## 6. Notifications System
**Features:**
- **Types:** Appointment reminders, Mood log reminders, Crisis alerts.
- **Management:** Users can toggle specific notification types.
- **Real-time:** Alerts for upcoming sessions (1 hour before).

**API Endpoints:**
- `GET /api/user/notifications` - Get all notifications.
- `PUT /api/user/notifications/mark-read` - Mark notifications as read.

---

## 7. Blogs & Resources (Admin Managed)
**Features:**
- **View Blogs:** Read mental health articles.
- **Admin Approval:** New blogs require admin approval before publishing.

**API Endpoints:**
- `GET /api/blog/list` - List published blogs.
- `GET /api/blog/:id` - Get blog details.
- `PUT /api/admin/blog/approve/:id` - (Admin Only) Approve blog.

---

## 8. Additional Features
- **Testimonials:** Users can submit testimonials; Admins approve them.
  - `POST /api/user/testimonial` - Submit testimonial.
  - `GET /api/testimonials` - View public testimonials.
- **Excel Download:** Export mood/appointment data.
  - `GET /api/user/export-data` - Download Excel report.

---

## Implementation Guidelines
1. **Strict Types:** Ensure all Enums (Mood Labels, Activities) match backend models exactly.
2. **Error Handling:** Auto-retry mood submission if "tracking not enabled".
3. **Data Sync:** Always refresh User ID on login to sync `AsyncStorage`.
4. **UI/UX:** Use soothing colors (Green/Beige), consistent with Raskamon web branding.
