import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  Video,
  Building,
  Phone,
  User,
  AlertCircle,
  CheckCircle,
  MessageSquare,
} from "lucide-react-native";
import api from "../../../utils/api";

// Session types
const SESSION_TYPES = [
  { id: "Online", label: "Online", icon: Video },
  { id: "In-person", label: "In-Person", icon: Building },
];

// Communication methods for online sessions
const COMMUNICATION_METHODS = [
  { id: "Zoom", label: "Zoom", icon: Video },
  { id: "Google Meet", label: "Google Meet", icon: Video },
  { id: "Phone Call", label: "Phone Call", icon: Phone },
];

// Reasons for visit
const REASONS_FOR_VISIT = [
  "Anxiety",
  "Depression",
  "Relationship Issues",
  "Stress Management",
  "Trauma/PTSD",
  "General Consultation",
  "Other",
];

export default function DoctorDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // States
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState(null);
  const [booking, setBooking] = useState(false);

  // Booking form states
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]); // Array of unavailable times
  const [sessionType, setSessionType] = useState("Online");
  const [communicationMethod, setCommunicationMethod] = useState("Zoom");
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [briefNotes, setBriefNotes] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");

  useEffect(() => {
    console.log("[DoctorDetail] Loading doctor with ID:", id);
    // Reset state when doctor ID changes
    setDoctor(null);
    setLoading(true);
    setSelectedDate(null);
    setSelectedTime(null);
    setBookedSlots([]);
    loadDoctor();
  }, [id]);

  // Fetch booked slots when date changes
  useEffect(() => {
    if (selectedDate && doctor) {
      console.log("Fetching booked slots for:", selectedDate)
      api.getBookedSlots(doctor._id, selectedDate).then(slots => {
        console.log("Booked slots:", slots)
        setBookedSlots(slots || [])
      })
    }
  }, [selectedDate, doctor]);

  const loadDoctor = async () => {
    try {
      const response = await api.getDoctors();
      if (response.success && response.doctors) {
        console.log("[DoctorDetail] Searching for doctor ID:", id);
        const foundDoctor = response.doctors.find((d) => d._id === id);
        console.log("[DoctorDetail] Found doctor:", foundDoctor?.name || "NOT FOUND");
        setDoctor(foundDoctor || null);
      }
    } catch (error) {
      console.error("[DoctorDetail] Error loading doctor:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert("Error", "Please select a date and time");
      return;
    }

    if (!reasonForVisit) {
      Alert.alert("Error", "Please select a reason for visit");
      return;
    }

    if (reasonForVisit === "Other" && !otherReason.trim()) {
      Alert.alert("Error", "Please specify your reason for visit");
      return;
    }

    if (!consentGiven) {
      Alert.alert("Error", "Please agree to the cancellation policy and consent to telehealth");
      return;
    }

    if (sessionType === "Online" && !communicationMethod) {
      Alert.alert("Error", "Please select a communication method for online sessions");
      return;
    }

    setBooking(true);
    try {
      const appointmentDetails = {
        reasonForVisit: reasonForVisit === "Other" ? otherReason.trim() : reasonForVisit,
        sessionType: sessionType,
        communicationMethod: sessionType === "Online" ? communicationMethod : undefined,
        briefNotes: briefNotes.trim(),
        emergencyContact: {
          name: emergencyName.trim(),
          phone: emergencyPhone.trim(),
          relationship: emergencyRelationship.trim(),
        },
        consentGiven: true,
      };

      // 1. Check Availability (Prevent Overlap)
      const isAvailable = await api.checkAvailability(doctor._id, selectedDate, selectedTime);
      if (!isAvailable) {
        Alert.alert("Slot Unavailable", "This time slot has just been booked by another patient. Please select a different time.");
        return;
      }

      const response = await api.bookAppointment(
        doctor._id,
        selectedDate,
        selectedTime,
        appointmentDetails
      );

      if (response.success) {
        const appointmentId = response.appointment?._id || response.appointmentId || response.tempReservationId;
        console.log("[DoctorDetail] Booking successful, proceeding to payment. ID:", appointmentId);

        if (!appointmentId) {
          Alert.alert("Error", "Booking created but ID is missing. Please check My Appointments.");
          return;
        }

        router.push({
          pathname: "/(tabs)/doctors/payment",
          params: {
            appointmentId,
            amount: doctor.fees,
            doctorName: doctor.name
          }
        });
      } else {
        Alert.alert("Error", response.message || "Failed to book appointment");
      }
    } catch (error) {
      console.error("[DoctorDetail] Booking error:", error);
      Alert.alert("Error", error.message || "Failed to book appointment");
    } finally {
      setBooking(false);
    }
  };

  // Generate time slots (matching web app: 10 AM - 9 PM)
  const timeSlots = [
    "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
    "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
    "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM",
    "08:00 PM", "08:30 PM", "09:00 PM",
  ];

  // Generate next 7 days
  const generateDates = () => {
    const dates = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      dates.push({
        value: `${year}-${month}-${day}`, // Standardize date format YYYY-MM-DD
        day: days[date.getDay()],
        date: day,
      });
    }
    return dates;
  };

  const dates = generateDates();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color="#1F2937" size={24} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Doctor not found</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
            <Text style={styles.goBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.push("/(tabs)/doctors")} style={styles.backBtn}>
          <ArrowLeft color="#1F2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Appointment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor Info Card */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorRow}>
            <Image
              source={{ uri: doctor.image || "https://via.placeholder.com/100" }}
              style={styles.doctorImage}
            />
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              <Text style={styles.doctorSpecialty}>{doctor.speciality}</Text>
              <Text style={styles.doctorDegree}>{doctor.degree}</Text>
              <View style={styles.experienceRow}>
                <Clock size={14} color="#6B7280" />
                <Text style={styles.experienceText}>{doctor.experience}</Text>
              </View>
            </View>
          </View>

          {/* Rating & Availability */}
          <View style={styles.ratingRow}>
            <View style={styles.ratingContainer}>
              <Star color="#F59E0B" size={16} fill="#F59E0B" />
              <Text style={styles.ratingText}>4.8</Text>
              <Text style={styles.reviewsText}>(200+ reviews)</Text>
            </View>
            {doctor.available && (
              <View style={styles.availableBadge}>
                <Text style={styles.availableText}>Available</Text>
              </View>
            )}
          </View>

          {/* About Doctor */}
          {doctor.about && (
            <View style={styles.aboutSection}>
              <Text style={styles.aboutTitle}>About</Text>
              <Text style={styles.aboutText}>{doctor.about}</Text>
            </View>
          )}

          {/* Languages */}
          {doctor.languageSpoken && (
            <View style={styles.languagesSection}>
              <Text style={styles.languagesTitle}>Languages Spoken</Text>
              <Text style={styles.languagesText}>{doctor.languageSpoken}</Text>
            </View>
          )}

          {/* Fee */}
          <View style={styles.feeCard}>
            <Text style={styles.feeLabel}>Consultation Fee</Text>
            <Text style={styles.feeAmount}>₹{doctor.fees}</Text>
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
            {dates.map((dateObj) => (
              <TouchableOpacity
                key={dateObj.value}
                style={[
                  styles.dateItem,
                  selectedDate === dateObj.value && styles.dateItemSelected,
                ]}
                onPress={() => setSelectedDate(dateObj.value)}
              >
                <Text style={[styles.dateDay, selectedDate === dateObj.value && styles.dateDaySelected]}>
                  {dateObj.day}
                </Text>
                <Text style={[styles.dateNum, selectedDate === dateObj.value && styles.dateNumSelected]}>
                  {dateObj.date}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Selection */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Time</Text>
            <View style={styles.timeGrid}>
              {timeSlots.map((time) => {
                const isBooked = bookedSlots.includes(time);
                return (
                  <TouchableOpacity
                    key={time}
                    disabled={isBooked}
                    style={[
                      styles.timeItem,
                      selectedTime === time && styles.timeItemSelected,
                      isBooked && styles.timeItemBooked
                    ]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[
                      styles.timeText,
                      selectedTime === time && styles.timeTextSelected,
                      isBooked && styles.timeTextBooked
                    ]}>
                      {time}
                    </Text>
                    {isBooked && (
                      <Text style={styles.bookedLabel}>Booked</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Session Type */}
        {selectedDate && selectedTime && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Type</Text>
            <View style={styles.sessionRow}>
              {SESSION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.sessionItem,
                    sessionType === type.id && styles.sessionItemSelected,
                  ]}
                  onPress={() => setSessionType(type.id)}
                >
                  <type.icon size={20} color={sessionType === type.id ? "#FFFFFF" : "#6B7280"} />
                  <Text style={[styles.sessionText, sessionType === type.id && styles.sessionTextSelected]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Communication Method (for Online) */}
        {selectedDate && selectedTime && sessionType === "Online" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Communication Method</Text>
            <View style={styles.commGrid}>
              {COMMUNICATION_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.commItem,
                    communicationMethod === method.id && styles.commItemSelected,
                  ]}
                  onPress={() => setCommunicationMethod(method.id)}
                >
                  <method.icon size={18} color={communicationMethod === method.id ? "#FFFFFF" : "#6B7280"} />
                  <Text style={[styles.commText, communicationMethod === method.id && styles.commTextSelected]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Reason for Visit */}
        {selectedDate && selectedTime && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reason for Visit *</Text>
            <View style={styles.reasonGrid}>
              {REASONS_FOR_VISIT.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonItem,
                    reasonForVisit === reason && styles.reasonItemSelected,
                  ]}
                  onPress={() => setReasonForVisit(reason)}
                >
                  <Text style={[styles.reasonText, reasonForVisit === reason && styles.reasonTextSelected]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {reasonForVisit === "Other" && (
              <TextInput
                style={styles.textInput}
                placeholder="Please specify your reason..."
                placeholderTextColor="#9CA3AF"
                value={otherReason}
                onChangeText={setOtherReason}
              />
            )}
          </View>
        )}

        {/* Brief Notes */}
        {selectedDate && selectedTime && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Brief Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Any additional information you'd like to share..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              value={briefNotes}
              onChangeText={setBriefNotes}
            />
          </View>
        )}

        {/* Emergency Contact - REMOVED to match web simplicity */}

        {/* Consent */}
        {selectedDate && selectedTime && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setConsentGiven(!consentGiven)}
            >
              <View style={[styles.checkbox, consentGiven && styles.checkboxChecked]}>
                {consentGiven && <CheckCircle size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.consentText}>
                I agree to the cancellation policy and consent to telehealth consultation
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Book Button */}
        {selectedDate && selectedTime && (
          <View style={styles.bookBtnContainer}>
            <TouchableOpacity
              style={[
                styles.bookBtn,
                (!reasonForVisit || !consentGiven) && styles.bookBtnDisabled,
              ]}
              onPress={handleBookAppointment}
              disabled={booking || !reasonForVisit || !consentGiven}
            >
              {booking ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.bookBtnText}>Proceed to Payment - ₹{doctor.fees}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 16,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#6B7280",
    fontSize: 16,
  },
  goBackBtn: {
    marginTop: 16,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  goBackBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  doctorCard: {
    margin: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  doctorImage: {
    width: 90,
    height: 90,
    borderRadius: 16,
    marginRight: 16,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 15,
    color: "#F59E0B",
    fontWeight: "500",
    marginBottom: 4,
  },
  doctorDegree: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  experienceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  experienceText: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 4,
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  reviewsText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#6B7280",
  },
  availableBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  availableText: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "600",
  },
  aboutSection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 22,
  },
  languagesSection: {
    marginBottom: 16,
  },
  languagesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  languagesText: {
    fontSize: 14,
    color: "#6B7280",
  },
  feeCard: {
    backgroundColor: "#FEF3C7",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feeLabel: {
    fontSize: 14,
    color: "#92400E",
    fontWeight: "500",
  },
  feeAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#10B981",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  dateList: {
    gap: 12,
  },
  dateItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    minWidth: 70,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dateItemSelected: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
  dateDay: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 4,
  },
  dateDaySelected: {
    color: "#FFFFFF",
  },
  dateNum: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  dateNumSelected: {
    color: "#FFFFFF",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  timeItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    minWidth: "30%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  timeItemSelected: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
  timeItemBooked: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
    borderWidth: 2,
    opacity: 0.7,
  },
  timeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  timeTextSelected: {
    color: "#FFFFFF",
  },
  timeTextBooked: {
    color: "#DC2626",
    textDecorationLine: "line-through",
  },
  bookedLabel: {
    fontSize: 10,
    color: "#DC2626",
    fontWeight: "600",
    marginTop: 2,
  },
  sessionRow: {
    flexDirection: "row",
    gap: 12,
  },
  sessionItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  sessionItemSelected: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  sessionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  sessionTextSelected: {
    color: "#FFFFFF",
  },
  commGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  commItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  commItemSelected: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  commText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  commTextSelected: {
    color: "#FFFFFF",
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  reasonItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reasonItemSelected: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  reasonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  reasonTextSelected: {
    color: "#FFFFFF",
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
    marginTop: 0,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  bookBtnContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  bookBtn: {
    backgroundColor: "#10B981",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  bookBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  bookBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
