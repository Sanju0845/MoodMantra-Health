import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  Calendar,
  Clock,
  Users,
  FileText,
  X,
  User,
  Phone,
  Calendar as CalendarIcon,
  CheckCircle,
  MessageSquare,
  Pill,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  Smile,
} from "lucide-react-native";
import api from "../../utils/api";

const { width } = Dimensions.get("window");

export default function DoctorAppointments() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [sortOrder, setSortOrder] = useState("new");
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [moodData, setMoodData] = useState(null);
  const [moodLoading, setMoodLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("Month");

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.getDoctorAppointments();
      if (res.success && res.appointments) {
        setAppointments(res.appointments);
      } else {
        Alert.alert("Error", res.message || "Failed to load appointments");
      }
    } catch (error) {
      console.error("[DoctorAppointments] loadAppointments error:", error);
      Alert.alert("Error", error.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : new Date(0);
    const dateB = b.date ? new Date(b.date) : new Date(0);

    if (sortOrder === "new") {
      return dateB - dateA;
    } else if (sortOrder === "old") {
      return dateA - dateB;
    } else {
      return dateA - dateB;
    }
  });

  // Group appointments by date for "date by date" view
  const groupedAppointments = sortedAppointments.reduce((acc, apt) => {
    if (!apt.date) return acc;
    const date = new Date(apt.date);
    if (isNaN(date.getTime())) return acc; // Skip invalid dates
    const dateStr = date.toDateString(); // Use sortable date string
    const displayKey = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    if (!acc[dateStr]) {
      acc[dateStr] = { displayKey, appointments: [] };
    }
    acc[dateStr].appointments.push(apt);
    return acc;
  }, {});

  // Convert to array and sort
  const groupedAppointmentsArray = Object.keys(groupedAppointments)
    .sort((a, b) => new Date(a) - new Date(b))
    .map(key => ({ dateKey: groupedAppointments[key].displayKey, appointments: groupedAppointments[key].appointments }));

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleComplete = async (appointmentId) => {
    try {
      setActionLoadingId(appointmentId);
      const res = await api.completeDoctorAppointment(appointmentId);
      if (res.success) {
        setAppointments((prev) =>
          prev.map((item) =>
            item._id === appointmentId
              ? { ...item, isCompleted: true, cancelled: false }
              : item
          )
        );
        if (selectedAppointment?._id === appointmentId) {
          setSelectedAppointment((prev) =>
            prev ? { ...prev, isCompleted: true, cancelled: false } : prev
          );
        }
        Alert.alert("Success", res.message || "Appointment marked completed.");
      } else {
        Alert.alert("Error", res.message || "Failed to complete appointment.");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to complete appointment.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (appointmentId) => {
    try {
      setActionLoadingId(appointmentId);
      const res = await api.cancelDoctorAppointment(appointmentId);
      if (res.success) {
        setAppointments((prev) =>
          prev.map((item) =>
            item._id === appointmentId
              ? { ...item, cancelled: true, isCompleted: false }
              : item
          )
        );
        if (selectedAppointment?._id === appointmentId) {
          setSelectedAppointment((prev) =>
            prev ? { ...prev, cancelled: true, isCompleted: false } : prev
          );
        }
        Alert.alert("Success", res.message || "Appointment cancelled.");
      } else {
        Alert.alert("Error", res.message || "Failed to cancel appointment.");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to cancel appointment.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openDetailsModal = (appointment) => {
    setSelectedAppointment(appointment);
    setDetailsModalVisible(true);
  };

  const closeDetailsModal = () => {
    setDetailsModalVisible(false);
    setSelectedAppointment(null);
  };

  // Get patient ID from appointment - check multiple possible fields
  const getPatientIdFromAppointment = (appointment) => {
    return appointment?.userId || appointment?.userData?._id || appointment?.userData?.userId || appointment?.patientId;
  };

  const loadMoodData = async (appointment) => {
    const patientId = getPatientIdFromAppointment(appointment);

    console.log("[MoodData] Loading for appointment:", appointment);
    console.log("[MoodData] Patient ID:", patientId);

    if (!patientId) {
      Alert.alert("Error", "Patient ID not available. Please check appointment data.");
      return;
    }
    try {
      setMoodLoading(true);
      const periodDays = selectedPeriod === "Week" ? "7" : selectedPeriod === "Month" ? "30" : selectedPeriod === "Quarter" ? "90" : "365";

      const [entriesRes, analyticsRes] = await Promise.all([
        api.getMoodEntries(patientId, 1, 20),
        api.getMoodAnalytics(patientId, periodDays),
      ]);

      setMoodData({
        entries: entriesRes?.entries || entriesRes?.moodEntries || [],
        analytics: analyticsRes || {},
        patientId,
        appointment,
      });
      setMoodModalVisible(true);
    } catch (error) {
      console.error("[MoodData] Error:", error);
      Alert.alert("Error", "Failed to load mood data: " + error.message);
    } finally {
      setMoodLoading(false);
    }
  };

  const renderStatusBadge = (appointment) => {
    let label = "Scheduled";
    let style = styles.statusPending;

    if (appointment.cancelled) {
      label = "Cancelled";
      style = styles.statusCancelled;
    } else if (appointment.isCompleted) {
      label = "Completed";
      style = styles.statusCompleted;
    }

    return (
      <View style={[styles.statusBadge, style]}>
        <Text style={styles.statusText}>{label}</Text>
      </View>
    );
  };

  const getMoodEmoji = (score) => {
    if (score >= 4) return "😊";
    if (score >= 3) return "😐";
    if (score >= 2) return "😟";
    return "😢";
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#4A9B7F" />
        <Text style={styles.loadingText}>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerIcon}>
              <Calendar color="#4A9B7F" size={28} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.sortButton, sortOrder === "date" && styles.sortButtonActive]}
                onPress={() => setSortOrder("date")}
              >
                <CalendarIcon color={sortOrder === "date" ? "#FFFFFF" : "#4A9B7F"} size={18} />
                <Text style={[styles.sortButtonText, sortOrder === "date" && styles.sortButtonTextActive]}>Date by Date</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => setSortModalVisible(true)}
              >
                <ArrowUpDown color="#4A9B7F" size={18} />
                <Text style={styles.sortButtonText}>
                  {sortOrder === "new" ? "New to Old" : sortOrder === "old" ? "Old to New" : "Sort By"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.title}>Appointments</Text>
          <Text style={styles.subtitle}>Review, accept, or cancel your bookings</Text>
        </View>

        {sortedAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar color="#9CA3AF" size={48} />
            <Text style={styles.emptyStateText}>No appointments yet</Text>
            <Text style={styles.emptyStateSubtext}>New bookings will appear here</Text>
          </View>
        ) : sortOrder === "date" ? (
          // Date by Date view - grouped
          <View style={styles.list}>
            {groupedAppointmentsArray.map((group) => (
              <View key={group.dateKey}>
                <View style={styles.dateGroupHeader}>
                  <Text style={styles.dateGroupTitle}>{group.dateKey}</Text>
                  <Text style={styles.dateGroupCount}>{group.appointments.length} appointment{group.appointments.length !== 1 ? 's' : ''}</Text>
                </View>
                {group.appointments.map((appointment) => (
                  <View key={appointment._id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardIcon}>
                        <Clock color="#4A9B7F" size={20} />
                      </View>
                      <View style={styles.cardHeaderInfo}>
                        <Text style={styles.cardDate}>
                          {formatTime(appointment.date)}
                        </Text>
                        <Text style={styles.cardPatient}>
                          {appointment.userData?.name || "Patient"}
                        </Text>
                      </View>
                      {renderStatusBadge(appointment)}
                    </View>

                    <View style={styles.summaryRow}>
                      <View style={styles.summaryItem}>
                        <Users color="#6B7280" size={16} />
                        <Text style={styles.summaryLabel}>{appointment.sessionType || "Session"}</Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <FileText color="#6B7280" size={16} />
                        <Text style={styles.summaryLabel} numberOfLines={1}>
                          {appointment.reasonForVisit || "Reason not set"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.viewDetailsButton]}
                        onPress={() => openDetailsModal(appointment)}
                      >
                        <FileText color="#FFFFFF" size={16} />
                        <Text style={styles.actionButtonText}>Details</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton, (appointment.cancelled || appointment.isCompleted) && styles.actionButtonDisabled]}
                        disabled={!!actionLoadingId || appointment.cancelled || appointment.isCompleted}
                        onPress={() => handleComplete(appointment._id)}
                      >
                        {actionLoadingId === appointment._id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.actionButtonText}>Accept</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton, appointment.cancelled && styles.actionButtonDisabled]}
                        disabled={!!actionLoadingId || appointment.cancelled || appointment.isCompleted}
                        onPress={() => handleCancel(appointment._id)}
                      >
                        <Text style={styles.actionButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {sortedAppointments.map((appointment) => (
              <View key={appointment._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <Clock color="#4A9B7F" size={20} />
                  </View>
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.cardDate}>
                      {formatDate(appointment.date)} • {formatTime(appointment.date)}
                    </Text>
                    <Text style={styles.cardPatient}>
                      {appointment.userData?.name || "Patient"}
                    </Text>
                  </View>
                  {renderStatusBadge(appointment)}
                </View>

                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Users color="#6B7280" size={16} />
                    <Text style={styles.summaryLabel}>{appointment.sessionType || "Session"}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <FileText color="#6B7280" size={16} />
                    <Text style={styles.summaryLabel} numberOfLines={1}>
                      {appointment.reasonForVisit || "Reason not set"}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.viewDetailsButton]}
                    onPress={() => openDetailsModal(appointment)}
                  >
                    <FileText color="#FFFFFF" size={16} />
                    <Text style={styles.actionButtonText}>Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton, (appointment.cancelled || appointment.isCompleted) && styles.actionButtonDisabled]}
                    disabled={!!actionLoadingId || appointment.cancelled || appointment.isCompleted}
                    onPress={() => handleComplete(appointment._id)}
                  >
                    {actionLoadingId === appointment._id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.actionButtonText}>Accept</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton, appointment.cancelled && styles.actionButtonDisabled]}
                    disabled={!!actionLoadingId || appointment.cancelled || appointment.isCompleted}
                    onPress={() => handleCancel(appointment._id)}
                  >
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Details Modal - Compact */}
      <Modal visible={detailsModalVisible} transparent animationType="slide" onRequestClose={closeDetailsModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            <ScrollView showsVerticalScrollIndicator={false} bounces={true}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Appointment Details</Text>
                <TouchableOpacity style={styles.closeButton} onPress={closeDetailsModal}>
                  <X color="#6B7280" size={20} />
                </TouchableOpacity>
              </View>

              {selectedAppointment && (
                <>
                  {/* Patient Info Card - Compact */}
                  <View style={styles.patientCard}>
                    <View style={styles.patientAvatar}>
                      <Text style={styles.avatarText}>
                        {(selectedAppointment.userData?.name || "P").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.patientDetails}>
                      <Text style={styles.patientName}>{selectedAppointment.userData?.name || "N/A"}</Text>
                      <Text style={styles.patientEmail}>{selectedAppointment.userData?.email || "N/A"}</Text>
                      <Text style={styles.patientPhone}>📞 {selectedAppointment.userData?.phone || "N/A"}</Text>
                    </View>
                    {selectedAppointment.userData?.consentGiven && (
                      <View style={styles.trackingBadge}>
                        <CheckCircle color="#4A9B7F" size={14} />
                        <Text style={styles.trackingText}>Mood Tracking</Text>
                      </View>
                    )}
                  </View>

                  {/* Stats Row */}
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Date</Text>
                      <Text style={styles.statValue}>{formatDate(selectedAppointment.date)}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Time</Text>
                      <Text style={styles.statValue}>{selectedAppointment.slotTime || formatTime(selectedAppointment.date)}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Amount</Text>
                      <Text style={styles.statValue}>₹{selectedAppointment.amount || 0}</Text>
                    </View>
                  </View>

                  {/* Info Grid */}
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Session Type</Text>
                      <Text style={styles.infoValue}>{selectedAppointment.sessionType || "N/A"}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Payment</Text>
                      <Text style={[styles.infoValue, { color: selectedAppointment.payment ? "#10B981" : "#EF4444" }]}>
                        {selectedAppointment.payment ? "Paid" : "Not Paid"}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Status</Text>
                      {renderStatusBadge(selectedAppointment)}
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Consent</Text>
                      <Text style={[styles.infoValue, { color: selectedAppointment.consentGiven ? "#10B981" : "#EF4444" }]}>
                        {selectedAppointment.consentGiven ? "Yes" : "No"}
                      </Text>
                    </View>
                  </View>

                  {/* Reason */}
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>Reason for Visit</Text>
                    <Text style={styles.reasonText}>{selectedAppointment.reasonForVisit || "Not specified"}</Text>
                  </View>

                  {/* Chat Summary */}
                  {selectedAppointment.chatSummary && (
                    <View style={styles.reasonBox}>
                      <Text style={styles.reasonLabel}>Chat Summary</Text>
                      <Text style={styles.reasonText}>{selectedAppointment.chatSummary}</Text>
                    </View>
                  )}

                  {/* Mood Data Button */}
                  <TouchableOpacity
                    style={styles.moodButton}
                    onPress={() => loadMoodData(selectedAppointment)}
                    disabled={moodLoading}
                  >
                    {moodLoading ? (
                      <ActivityIndicator size="small" color="#4A9B7F" />
                    ) : (
                      <>
                        <BarChart3 color="#4A9B7F" size={18} />
                        <Text style={styles.moodButtonText}>View Mood Data</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Close Button */}
                  <TouchableOpacity style={styles.modalCloseButton} onPress={closeDetailsModal}>
                    <Text style={styles.modalCloseButtonText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal visible={sortModalVisible} transparent animationType="fade" onRequestClose={() => setSortModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setSortModalVisible(false)}>
          <View style={styles.sortModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sortModalContent}>
                <Text style={styles.sortModalTitle}>Sort By</Text>
                {["new", "old", "date"].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.sortOption, sortOrder === option && styles.sortOptionSelected]}
                    onPress={() => {
                      setSortOrder(option);
                      setSortModalVisible(false);
                    }}
                  >
                    <Text style={[styles.sortOptionText, sortOrder === option && styles.sortOptionTextSelected]}>
                      {option === "new" ? "New to Old" : option === "old" ? "Old to New" : "Date by Date"}
                    </Text>
                    {sortOrder === option && <CheckCircle color="#4A9B7F" size={18} />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Mood Data Modal */}
      <Modal visible={moodModalVisible} transparent animationType="slide" onRequestClose={() => setMoodModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.moodModalContent}>
            <View style={styles.dragHandle} />

            <ScrollView showsVerticalScrollIndicator={false} bounces={true}>
              {/* Mood Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Patient Mood Data</Text>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={() => setMoodModalVisible(false)}>
                  <X color="#6B7280" size={20} />
                </TouchableOpacity>
              </View>

              {/* Period Selector */}
              <View style={styles.periodRow}>
                {["Week", "Month", "Quarter", "Year"].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[styles.periodTab, selectedPeriod === period && styles.periodTabActive]}
                    onPress={() => {
                      setSelectedPeriod(period);
                      if (moodData?.appointment) loadMoodData(moodData.appointment);
                    }}
                  >
                    <Text style={[styles.periodTabText, selectedPeriod === period && styles.periodTabTextActive]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Patient Info */}
              {selectedAppointment && (
                <View style={styles.moodPatientCard}>
                  <View style={styles.moodAvatar}>
                    <Text style={styles.moodAvatarText}>
                      {(selectedAppointment.userData?.name || "P").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.moodPatientName}>{selectedAppointment.userData?.name || "Patient"}</Text>
                    <Text style={styles.moodPatientInfo}>
                      ✉️ {selectedAppointment.userData?.email || "N/A"} • 📞 {selectedAppointment.userData?.phone || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.trackingEnabled}>
                    <CheckCircle color="#4A9B7F" size={14} />
                    <Text style={styles.trackingEnabledText}>Mood Tracking Enabled</Text>
                  </View>
                </View>
              )}

              {/* Stats Cards */}
              <View style={styles.moodStatsRow}>
                <View style={styles.moodStatCard}>
                  <Text style={styles.moodStatLabel}>Average Mood</Text>
                  <Text style={styles.moodStatValue}>{moodData?.analytics?.averageMood?.toFixed(1) || "0.0"}</Text>
                  <View style={styles.trendRow}>
                    {(moodData?.analytics?.trend === "up" || moodData?.analytics?.averageMood >= 3) ? (
                      <TrendingUp color="#10B981" size={14} />
                    ) : (
                      <TrendingDown color="#EF4444" size={14} />
                    )}
                    <Text style={[styles.trendText, { color: moodData?.analytics?.averageMood >= 3 ? "#10B981" : "#EF4444" }]}>
                      {moodData?.analytics?.averageMood >= 3 ? "Improving" : "Declining"}
                    </Text>
                  </View>
                </View>
                <View style={styles.moodStatCard}>
                  <Text style={styles.moodStatLabel}>Total Entries</Text>
                  <Text style={styles.moodStatValue}>{moodData?.entries?.length || moodData?.analytics?.totalEntries || 0}</Text>
                  <Text style={styles.moodStatSub}>Last {selectedPeriod === "Week" ? "7" : selectedPeriod === "Month" ? "30" : selectedPeriod === "Quarter" ? "90" : "365"} days</Text>
                </View>
                <View style={styles.moodStatCard}>
                  <Text style={styles.moodStatLabel}>AI Analysis</Text>
                  <Text style={styles.moodStatValue}>{moodData?.analytics?.aiAnalysis ? "Available" : "None"}</Text>
                  <Text style={styles.moodStatSub}>{moodData?.analytics?.aiAnalysis ? "View insights" : "No consent"}</Text>
                </View>
              </View>

              {/* Recent Mood Entries */}
              <View style={styles.entriesSection}>
                <View style={styles.entriesHeader}>
                  <Text style={styles.entriesTitle}>Recent Mood Entries</Text>
                  <TouchableOpacity
                    style={styles.refreshBtn}
                    onPress={() => moodData?.appointment && loadMoodData(moodData.appointment)}
                  >
                    <RefreshCw color="#4A9B7F" size={14} />
                    <Text style={styles.refreshText}>Refresh</Text>
                  </TouchableOpacity>
                </View>

                {moodData?.entries?.length > 0 ? (
                  moodData.entries.slice(0, 10).map((entry, index) => (
                    <View key={entry._id || index} style={styles.moodEntry}>
                      <View style={styles.moodEntryLeft}>
                        <Text style={styles.moodEmoji}>{getMoodEmoji(entry.moodScore)}</Text>
                        <View>
                          <Text style={styles.moodLabel}>{entry.moodLabel || "Mood"}</Text>
                          <Text style={styles.moodDate}>
                            {new Date(entry.createdAt || entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.moodEntryRight}>
                        <Text style={styles.moodScore}>Score: {entry.moodScore}/5</Text>
                        {entry.activities?.[0] && <Text style={styles.moodActivity}>{entry.activities[0]}</Text>}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.noEntries}>
                    <Smile color="#9CA3AF" size={32} />
                    <Text style={styles.noEntriesText}>No mood entries yet</Text>
                  </View>
                )}
              </View>

              {/* Close Button */}
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setMoodModalVisible(false)}>
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 20 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 },
  headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#E8F5F0", alignItems: "center", justifyContent: "center" },
  sortButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#E8F5F0", borderRadius: 10 },
  sortButtonActive: { backgroundColor: "#4A9B7F" },
  sortButtonText: { fontSize: 12, fontWeight: "600", color: "#4A9B7F" },
  sortButtonTextActive: { color: "#FFFFFF" },
  title: { fontSize: 24, fontWeight: "800", color: "#1F2937", marginBottom: 2 },
  subtitle: { fontSize: 14, color: "#6B7280" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#6B7280" },
  emptyState: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 32, alignItems: "center", elevation: 2 },
  emptyStateText: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginTop: 12 },
  emptyStateSubtext: { fontSize: 13, color: "#6B7280" },
  list: { gap: 12 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  cardIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#E8F5F0", alignItems: "center", justifyContent: "center", marginRight: 10 },
  cardHeaderInfo: { flex: 1 },
  cardDate: { fontSize: 13, fontWeight: "600", color: "#1F2937" },
  cardPatient: { fontSize: 13, color: "#4B5563", marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "600", color: "#111827" },
  statusPending: { backgroundColor: "#FEF3C7" },
  statusCompleted: { backgroundColor: "#D1FAE5" },
  statusCancelled: { backgroundColor: "#FEE2E2" },
  summaryRow: { flexDirection: "row", marginBottom: 10, gap: 10 },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  summaryLabel: { fontSize: 12, color: "#4B5563", flex: 1 },
  actionsRow: { flexDirection: "row", gap: 8 },
  actionButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 4 },
  viewDetailsButton: { backgroundColor: "#4A9B7F" },
  actionButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  acceptButton: { backgroundColor: "#10B981" },
  cancelButton: { backgroundColor: "#EF4444" },
  actionButtonDisabled: { opacity: 0.5 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "75%", paddingHorizontal: 16, paddingBottom: 20 },
  moodModalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%", paddingHorizontal: 16, paddingBottom: 20 },
  dragHandle: { width: 40, height: 4, backgroundColor: "#D1D5DB", borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },

  // Patient Card
  patientCard: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  patientAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#1F2937", alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  patientDetails: { flex: 1 },
  patientName: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  patientEmail: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  patientPhone: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  trackingBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  trackingText: { fontSize: 10, color: "#059669", fontWeight: "600" },

  // Stats Row
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: "#F9FAFB", borderRadius: 10, padding: 10, alignItems: "center" },
  statLabel: { fontSize: 10, color: "#6B7280", marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: "700", color: "#1F2937" },

  // Info Grid
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  infoItem: { width: (width - 48) / 2 - 4, backgroundColor: "#F9FAFB", borderRadius: 10, padding: 10 },
  infoLabel: { fontSize: 10, color: "#6B7280", marginBottom: 4 },
  infoValue: { fontSize: 13, fontWeight: "600", color: "#1F2937" },

  // Reason Box
  reasonBox: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, marginBottom: 12 },
  reasonLabel: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  reasonText: { fontSize: 13, color: "#1F2937" },

  // Mood Button
  moodButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#E8F5F0", paddingVertical: 12, borderRadius: 10, marginBottom: 12 },
  moodButtonText: { fontSize: 14, fontWeight: "600", color: "#4A9B7F" },

  // Modal Close
  modalCloseButton: { backgroundColor: "#4A9B7F", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 4 },
  modalCloseButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },

  // Mood Modal Styles
  periodRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  periodTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: "#F3F4F6" },
  periodTabActive: { backgroundColor: "#4A9B7F" },
  periodTabText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  periodTabTextActive: { color: "#FFFFFF" },

  moodPatientCard: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 12, flexWrap: "wrap" },
  moodAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1F2937", alignItems: "center", justifyContent: "center", marginRight: 10 },
  moodAvatarText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  moodPatientName: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  moodPatientInfo: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  trackingEnabled: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, width: "100%" },
  trackingEnabledText: { fontSize: 12, color: "#4A9B7F", fontWeight: "500" },

  moodStatsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  moodStatCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  moodStatLabel: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  moodStatValue: { fontSize: 20, fontWeight: "700", color: "#1F2937" },
  moodStatSub: { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  trendText: { fontSize: 11, fontWeight: "500" },

  entriesSection: { marginBottom: 12 },
  entriesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  entriesTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8F5F0", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  refreshText: { fontSize: 12, color: "#4A9B7F", fontWeight: "500" },

  moodEntry: { backgroundColor: "#FFFFFF", borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#F3F4F6" },
  moodEntryLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  moodEmoji: { fontSize: 28 },
  moodLabel: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  moodDate: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  moodEntryRight: { alignItems: "flex-end" },
  moodScore: { fontSize: 13, fontWeight: "600", color: "#1F2937" },
  moodActivity: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  noEntries: { alignItems: "center", padding: 24 },
  noEntriesText: { fontSize: 14, color: "#9CA3AF", marginTop: 8 },

  // Date Group
  dateGroupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 8, paddingHorizontal: 4 },
  dateGroupTitle: { fontSize: 16, fontWeight: "700", color: "#4A9B7F" },
  dateGroupCount: { fontSize: 12, color: "#6B7280", fontWeight: "500" },

  // Sort Modal
  sortModalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.3)", justifyContent: "center", alignItems: "center" },
  sortModalContent: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 8, width: 220, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  sortModalTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", padding: 12, paddingBottom: 8 },
  sortOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, marginVertical: 2 },
  sortOptionSelected: { backgroundColor: "#E8F5F0" },
  sortOptionText: { fontSize: 15, color: "#1F2937", fontWeight: "500" },
  sortOptionTextSelected: { color: "#4A9B7F", fontWeight: "600" },
});
