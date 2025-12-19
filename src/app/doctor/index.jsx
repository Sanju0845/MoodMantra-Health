import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  DollarSign,
  Calendar,
  Users,
  Clock,
  Download,
  FileText,
  TrendingUp,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  X,
} from "lucide-react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../utils/api";

const { width } = Dimensions.get("window");

export default function DoctorHome() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateAppointmentsModal, setDateAppointmentsModal] = useState(false);
  const [selectedDateAppointments, setSelectedDateAppointments] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.getDoctorDashboard();
      if (response.success && response.dashData) {
        setDashboardData(response.dashData);
      } else {
        Alert.alert("Error", "Failed to load dashboard data");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const handleDownloadPDF = async (reportType = "30days") => {
    try {
      setDownloading(true);
      const pdfUrl = api.getDoctorPatientsPDFUrl(reportType);
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        Alert.alert("Error", "Please login again");
        return;
      }

      const response = await fetch(pdfUrl, {
        method: "GET",
        headers: { dtoken: token },
      });

      if (!response.ok) throw new Error("Failed to download PDF");

      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      
      let base64Data = '';
      let i = 0;
      while (i < binary.length) {
        const a = binary.charCodeAt(i++);
        const b = i < binary.length ? binary.charCodeAt(i++) : 0;
        const c = i < binary.length ? binary.charCodeAt(i++) : 0;
        const bitmap = (a << 16) | (b << 8) | c;
        base64Data += base64Chars.charAt((bitmap >> 18) & 63);
        base64Data += base64Chars.charAt((bitmap >> 12) & 63);
        base64Data += i - 2 < binary.length ? base64Chars.charAt((bitmap >> 6) & 63) : '=';
        base64Data += i - 1 < binary.length ? base64Chars.charAt(bitmap & 63) : '=';
      }

      const fileName = `patients-report-${reportType}-${Date.now()}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: "base64" });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: "application/pdf", dialogTitle: "Share Report" });
      } else {
        Alert.alert("Success", `PDF saved: ${fileName}`);
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      setActionLoadingId(appointmentId);
      const res = await api.completeDoctorAppointment(appointmentId);
      if (res.success) {
        setDashboardData((prev) => ({
          ...prev,
          latestAppointments: prev.latestAppointments.map((item) =>
            item._id === appointmentId ? { ...item, isCompleted: true, cancelled: false } : item
          ),
        }));
        Alert.alert("Success", "Appointment completed");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    try {
      setActionLoadingId(appointmentId);
      const res = await api.cancelDoctorAppointment(appointmentId);
      if (res.success) {
        setDashboardData((prev) => ({
          ...prev,
          latestAppointments: prev.latestAppointments.map((item) =>
            item._id === appointmentId ? { ...item, cancelled: true, isCompleted: false } : item
          ),
        }));
        Alert.alert("Success", "Appointment cancelled");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Calendar Functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    // Previous month's days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({ date: daysInPrevMonth - i, isCurrentMonth: false, fullDate: new Date(year, month - 1, daysInPrevMonth - i) });
    }
    
    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: i, isCurrentMonth: true, fullDate: new Date(year, month, i) });
    }
    
    // Next month's days to fill the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: i, isCurrentMonth: false, fullDate: new Date(year, month + 1, i) });
    }
    
    return days;
  };

  const getAppointmentsForDate = (date) => {
    if (!dashboardData?.latestAppointments) return [];
    const dateStr = date.toDateString();
    return dashboardData.latestAppointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate.toDateString() === dateStr;
    });
  };

  const getDateColor = (date) => {
    const appointments = getAppointmentsForDate(date.fullDate);
    if (appointments.length === 0) return "#1F2937"; // Black/Default
    
    const hasPending = appointments.some(apt => !apt.isCompleted && !apt.cancelled);
    const hasCompleted = appointments.some(apt => apt.isCompleted);
    const hasCancelled = appointments.some(apt => apt.cancelled);
    
    if (hasPending) return "#10B981"; // Green
    if (hasCompleted) return "#10B981"; // Green
    if (hasCancelled) return "#EF4444"; // Red
    return "#F59E0B"; // Yellow
  };

  const handleDatePress = (date) => {
    const appointments = getAppointmentsForDate(date.fullDate);
    if (appointments.length > 0) {
      setSelectedDate(date.fullDate);
      setSelectedDateAppointments(appointments);
      setDateAppointmentsModal(true);
    }
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthYearString = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const daysOfWeek = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#4A9B7F" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const doctorName = dashboardData?.docName?.name || "Doctor";
  const earnings = dashboardData?.earnings || 0;
  const appointments = dashboardData?.appointments || 0;
  const patients = dashboardData?.patients || 0;
  const latestAppointments = dashboardData?.latestAppointments || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.doctorName}>Dr. {doctorName.split(" ")[0]}</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadDashboard}>
            <RefreshCw color="#4A9B7F" size={20} />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "#ECFDF5" }]}>
            <View style={[styles.statIcon, { backgroundColor: "#D1FAE5" }]}>
              <DollarSign color="#10B981" size={18} />
            </View>
            <Text style={[styles.statValue, { color: "#059669" }]}>₹{earnings.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#EEF2FF" }]}>
            <View style={[styles.statIcon, { backgroundColor: "#E0E7FF" }]}>
              <Calendar color="#4F46E5" size={18} />
            </View>
            <Text style={[styles.statValue, { color: "#4338CA" }]}>{appointments}</Text>
            <Text style={styles.statLabel}>Appointments</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FDF4FF" }]}>
            <View style={[styles.statIcon, { backgroundColor: "#FAE8FF" }]}>
              <Users color="#A855F7" size={18} />
            </View>
            <Text style={[styles.statValue, { color: "#9333EA" }]}>{patients}</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionCard} onPress={() => handleDownloadPDF("30days")} disabled={downloading}>
              <View style={[styles.actionIcon, { backgroundColor: "#FEE2E2" }]}>
                <FileText color="#EF4444" size={20} />
              </View>
              <Text style={styles.actionText}>PDF Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => handleDownloadPDF("90days")} disabled={downloading}>
              <View style={[styles.actionIcon, { backgroundColor: "#DBEAFE" }]}>
                <Download color="#3B82F6" size={20} />
              </View>
              <Text style={styles.actionText}>90 Days</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => handleDownloadPDF("365days")} disabled={downloading}>
              <View style={[styles.actionIcon, { backgroundColor: "#E0E7FF" }]}>
                <TrendingUp color="#6366F1" size={20} />
              </View>
              <Text style={styles.actionText}>Yearly</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarSection}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={previousMonth}>
              <ChevronLeft color="#4B5563" size={20} />
            </TouchableOpacity>
            <View style={styles.calendarTitleRow}>
              <Calendar color="#4A9B7F" size={18} />
              <Text style={styles.calendarTitle}>{monthYearString}</Text>
            </View>
            <TouchableOpacity onPress={nextMonth}>
              <ChevronRight color="#4B5563" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarGrid}>
            {/* Days of week */}
            {daysOfWeek.map((day) => (
              <View key={day} style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{day}</Text>
              </View>
            ))}

            {/* Calendar days */}
            {getDaysInMonth(currentMonth).map((day, index) => {
              const appointments = getAppointmentsForDate(day.fullDate);
              const dateColor = getDateColor(day);
              const today = new Date();
              const isToday = day.fullDate.toDateString() === today.toDateString();

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    !day.isCurrentMonth && styles.calendarDayDisabled,
                    isToday && styles.calendarDayToday,
                  ]}
                  onPress={() => handleDatePress(day)}
                  disabled={appointments.length === 0}
                >
                  <View style={[styles.dateCircle, { backgroundColor: appointments.length > 0 ? dateColor : "transparent" }]}>
                    <Text style={[styles.dateText, { color: appointments.length > 0 ? "#FFFFFF" : "#1F2937" }]}>{day.date}</Text>
                  </View>
                  {appointments.length > 1 && (
                    <Text style={styles.appointmentCount}>{appointments.length}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Recent Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Appointments</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {latestAppointments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Calendar color="#9CA3AF" size={40} />
              <Text style={styles.emptyText}>No appointments yet</Text>
            </View>
          ) : (
            latestAppointments.slice(0, 5).map((apt, idx) => (
              <View key={apt._id || idx} style={styles.appointmentCard}>
                <View style={styles.aptLeft}>
                  <View style={styles.aptAvatar}>
                    <Text style={styles.aptAvatarText}>
                      {(apt.userData?.name || "P").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.aptInfo}>
                    <Text style={styles.aptName}>{apt.userData?.name || "Patient"}</Text>
                    <Text style={styles.aptDateTime}>
                      {formatDate(apt.date)} • {formatTime(apt.date)}
                    </Text>
                  </View>
                </View>
                <View style={styles.aptRight}>
                  <View style={[
                    styles.aptStatus,
                    apt.cancelled ? styles.statusCancelled : apt.isCompleted ? styles.statusCompleted : styles.statusPending
                  ]}>
                    <Text style={[
                      styles.aptStatusText,
                      apt.cancelled ? { color: "#DC2626" } : apt.isCompleted ? { color: "#059669" } : { color: "#D97706" }
                    ]}>
                      {apt.cancelled ? "Cancelled" : apt.isCompleted ? "Done" : "Pending"}
                    </Text>
                  </View>
                  {!apt.cancelled && !apt.isCompleted && (
                    <View style={styles.aptActions}>
                      <TouchableOpacity
                        style={styles.aptActionBtn}
                        onPress={() => handleCompleteAppointment(apt._id)}
                        disabled={!!actionLoadingId}
                      >
                        {actionLoadingId === apt._id ? (
                          <ActivityIndicator size="small" color="#10B981" />
                        ) : (
                          <CheckCircle color="#10B981" size={22} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.aptActionBtn}
                        onPress={() => handleCancelAppointment(apt._id)}
                        disabled={!!actionLoadingId}
                      >
                        <XCircle color="#EF4444" size={22} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Date Appointments Modal */}
      <Modal visible={dateAppointmentsModal} transparent animationType="slide" onRequestClose={() => setDateAppointmentsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Appointments - {selectedDate?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </Text>
              <TouchableOpacity onPress={() => setDateAppointmentsModal(false)}>
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              {selectedDateAppointments.length} appointment{selectedDateAppointments.length !== 1 ? 's' : ''} on this day
            </Text>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedDateAppointments.map((apt, idx) => (
                <View key={apt._id || idx} style={styles.modalAppointmentCard}>
                  <View style={styles.modalAptHeader}>
                    <View style={styles.modalAptLeft}>
                      <View style={styles.modalAptAvatar}>
                        <Text style={styles.modalAptAvatarText}>
                          {(apt.userData?.name || "P").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.modalAptName}>{apt.userData?.name || "Patient"}</Text>
                        <Text style={styles.modalAptTime}>{formatTime(apt.date)}</Text>
                      </View>
                    </View>
                    <View style={[
                      styles.modalStatusBadge,
                      apt.cancelled ? styles.statusCancelled : apt.isCompleted ? styles.statusCompleted : styles.statusPending
                    ]}>
                      <Text style={[
                        styles.modalStatusText,
                        apt.cancelled ? { color: "#DC2626" } : apt.isCompleted ? { color: "#059669" } : { color: "#D97706" }
                      ]}>
                        {apt.cancelled ? "Cancelled" : apt.isCompleted ? "Completed" : "Pending"}
                      </Text>
                    </View>
                  </View>
                  {apt.reasonForVisit && (
                    <Text style={styles.modalAptReason}>Reason: {apt.reasonForVisit}</Text>
                  )}
                  {apt.sessionType && (
                    <Text style={styles.modalAptSession}>Type: {apt.sessionType}</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {downloading && (
        <View style={styles.overlay}>
          <View style={styles.overlayModal}>
            <ActivityIndicator size="large" color="#4A9B7F" />
            <Text style={styles.overlayText}>Downloading...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 100 },
  loadingText: { marginTop: 12, fontSize: 16, color: "#6B7280" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting: { fontSize: 14, color: "#6B7280", marginBottom: 2 },
  doctorName: { fontSize: 22, fontWeight: "800", color: "#1F2937" },
  refreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E8F5F0", alignItems: "center", justifyContent: "center" },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: "center" },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: "800", marginBottom: 2 },
  statLabel: { fontSize: 11, color: "#6B7280", fontWeight: "500" },

  // Calendar
  calendarSection: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, marginBottom: 20 },
  calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  calendarTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  calendarTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", width: "100%" },
  dayHeader: { width: "14.28%", alignItems: "center", marginBottom: 8 },
  dayHeaderText: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
  calendarDay: { width: "14.28%", height: 50, alignItems: "center", justifyContent: "center", marginBottom: 8, position: "relative" },
  calendarDayDisabled: { opacity: 0.3 },
  calendarDayToday: { opacity: 1 },
  dateCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  dateText: { fontSize: 14, fontWeight: "600" },
  appointmentCount: { position: "absolute", top: 0, right: 8, fontSize: 10, fontWeight: "700", color: "#FFFFFF", backgroundColor: "#EF4444", borderRadius: 8, minWidth: 16, height: 16, textAlign: "center", paddingHorizontal: 4 },

  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
  viewAll: { fontSize: 13, color: "#4A9B7F", fontWeight: "600" },

  actionsRow: { flexDirection: "row", gap: 10 },
  actionCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, alignItems: "center", elevation: 2 },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  actionText: { fontSize: 12, fontWeight: "600", color: "#374151" },

  emptyCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 32, alignItems: "center", elevation: 2 },
  emptyText: { fontSize: 14, color: "#9CA3AF", marginTop: 10 },

  appointmentCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 2 },
  aptLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  aptAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1F2937", alignItems: "center", justifyContent: "center", marginRight: 10 },
  aptAvatarText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  aptInfo: { flex: 1 },
  aptName: { fontSize: 14, fontWeight: "600", color: "#1F2937", marginBottom: 2 },
  aptDateTime: { fontSize: 12, color: "#6B7280" },
  aptRight: { alignItems: "flex-end" },
  aptStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 6 },
  statusPending: { backgroundColor: "#FEF3C7" },
  statusCompleted: { backgroundColor: "#D1FAE5" },
  statusCancelled: { backgroundColor: "#FEE2E2" },
  aptStatusText: { fontSize: 11, fontWeight: "600" },
  aptActions: { flexDirection: "row", gap: 8 },
  aptActionBtn: { padding: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%", padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1F2937" },
  modalSubtitle: { fontSize: 14, color: "#6B7280", marginBottom: 16 },
  modalScroll: { maxHeight: 400 },
  modalAppointmentCard: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, marginBottom: 10 },
  modalAptHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  modalAptLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  modalAptAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1F2937", alignItems: "center", justifyContent: "center", marginRight: 10 },
  modalAptAvatarText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  modalAptName: { fontSize: 15, fontWeight: "600", color: "#1F2937", marginBottom: 2 },
  modalAptTime: { fontSize: 12, color: "#6B7280" },
  modalStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  modalStatusText: { fontSize: 11, fontWeight: "600" },
  modalAptReason: { fontSize: 13, color: "#4B5563", marginTop: 4 },
  modalAptSession: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  overlayModal: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 28, alignItems: "center" },
  overlayText: { marginTop: 12, fontSize: 15, fontWeight: "600", color: "#1F2937" },
});
