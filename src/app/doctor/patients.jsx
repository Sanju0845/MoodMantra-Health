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
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  Users,
  User,
  Phone,
  Calendar,
  Eye,
  X,
  CheckCircle,
  FileText,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  Smile,
  Clock,
  XCircle,
  DollarSign,
  Mail,
  MapPin,
} from "lucide-react-native";
import api from "../../utils/api";

const { width } = Dimensions.get("window");

export default function DoctorPatients() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("Last 30 Days");
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [moodData, setMoodData] = useState(null);
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodPeriod, setMoodPeriod] = useState("Month");
  const [downloading, setDownloading] = useState(false);

  const periods = ["Last 7 Days", "Last 30 Days", "Last 90 Days", "All Time"];

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const res = await api.getDoctorPatients();
      if (res.success && res.patients) {
        setPatients(res.patients);
      } else {
        Alert.alert("Error", res.message || "Failed to load patients");
      }
    } catch (error) {
      console.error("[DoctorPatients] loadPatients error:", error);
      Alert.alert("Error", error.message || "Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  const openDetailsModal = (patient) => {
    setSelectedPatient(patient);
    setDetailsModalVisible(true);
  };

  const closeDetailsModal = () => {
    setDetailsModalVisible(false);
    setSelectedPatient(null);
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const reportType = selectedPeriod === "Last 7 Days" ? "7days" : 
                         selectedPeriod === "Last 30 Days" ? "30days" : 
                         selectedPeriod === "Last 90 Days" ? "90days" : "all";
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
        await Sharing.shareAsync(fileUri, { mimeType: "application/pdf", dialogTitle: "Share Patients Report" });
      } else {
        Alert.alert("Success", `PDF saved: ${fileName}`);
      }
    } catch (error) {
      console.error("[Patients] PDF download error:", error);
      Alert.alert("Error", error.message || "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      const reportType = selectedPeriod === "Last 7 Days" ? "7days" : 
                         selectedPeriod === "Last 30 Days" ? "30days" : 
                         selectedPeriod === "Last 90 Days" ? "90days" : "all";
      const excelUrl = api.getDoctorPatientsExcelUrl(reportType);
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        Alert.alert("Error", "Please login again");
        return;
      }

      const response = await fetch(excelUrl, {
        method: "GET",
        headers: { dtoken: token },
      });

      if (!response.ok) throw new Error("Failed to download Excel");

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

      const fileName = `patients-report-${reportType}-${Date.now()}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: "base64" });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Share Patients Report",
        });
      } else {
        Alert.alert("Success", `Excel saved: ${fileName}`);
      }
    } catch (error) {
      console.error("[Patients] Excel download error:", error);
      Alert.alert("Error", error.message || "Failed to download Excel");
    } finally {
      setDownloading(false);
    }
  };

  const getPatientId = (patient) => {
    return patient?.userId || patient?.userData?._id || patient?._id || patient?.patientId || patient?.id;
  };

  const loadMoodData = async (patient) => {
    const patientId = getPatientId(patient);
    
    if (!patientId) {
      Alert.alert("Error", "Patient ID not available");
      return;
    }
    
    try {
      setMoodLoading(true);
      const periodDays = moodPeriod === "Week" ? "7" : moodPeriod === "Month" ? "30" : moodPeriod === "Quarter" ? "90" : "365";
      
      const [entriesRes, analyticsRes] = await Promise.all([
        api.getMoodEntries(patientId, 1, 20),
        api.getMoodAnalytics(patientId, periodDays),
      ]);

      setMoodData({
        entries: entriesRes?.entries || entriesRes?.moodEntries || [],
        analytics: analyticsRes || {},
        patientId,
        patient,
      });
      setMoodModalVisible(true);
    } catch (error) {
      console.error("[MoodData] Error:", error);
      Alert.alert("Error", "Failed to load mood data: " + error.message);
    } finally {
      setMoodLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const renderStatusBadge = (patient) => {
    const status = patient.latestAppointment?.status || patient.lastAppointment?.status;
    const isConfirmed = status === "Confirmed" || patient.lastAppointment?.isCompleted;
    
    if (isConfirmed || status === "Confirmed") {
      return (
        <View style={[styles.statusBadge, styles.statusConfirmed]}>
          <Text style={styles.statusText}>• Confirmed</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusBadge, styles.statusPending]}>
        <Text style={styles.statusTextPending}>• Pending</Text>
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
        <Text style={styles.loadingText}>Loading patients...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Users color="#4A9B7F" size={24} />
          </View>
          <Text style={styles.title}>My Patients</Text>
          <Text style={styles.subtitle}>View all your patients</Text>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.periodSelector} onPress={() => setPeriodModalVisible(true)}>
            <Text style={styles.periodText}>{selectedPeriod}</Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          <View style={styles.downloadButtons}>
            <TouchableOpacity style={[styles.pdfButton, downloading && { opacity: 0.6 }]} onPress={handleDownloadPDF} disabled={downloading}>
              {downloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FileText color="#FFFFFF" size={14} />
                  <Text style={styles.downloadButtonText}>PDF</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.excelButton} onPress={handleDownloadExcel} disabled={downloading}>
              <FileText color="#FFFFFF" size={14} />
              <Text style={styles.downloadButtonText}>Excel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {patients.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color="#9CA3AF" size={40} />
            <Text style={styles.emptyStateText}>No patients yet</Text>
            <Text style={styles.emptyStateSubtext}>Your patients will appear here</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {patients.map((patient, index) => (
              <View key={patient.patientId || patient._id || index} style={styles.card}>
                <View style={styles.patientNumberBadge}>
                  <Text style={styles.patientNumber}>#{index + 1}</Text>
                </View>

                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(patient.name || "P").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patient.name || "Patient"}</Text>
                    <Text style={styles.patientEmail}>{patient.email || "No email"}</Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>AGE</Text>
                    <Text style={styles.detailValue}>{patient.age || "NA"}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>PHONE</Text>
                    <View style={styles.phoneRow}>
                      <Phone color="#6B7280" size={12} />
                      <Text style={styles.detailValue}>{patient.phone || "N/A"}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>LATEST APPOINTMENT</Text>
                    <View style={styles.appointmentInfo}>
                      <Calendar color="#6B7280" size={12} />
                      <Text style={styles.statValue}>
                        {patient.latestAppointment?.date || formatDate(patient.lastAppointment?.date) || "N/A"}
                      </Text>
                    </View>
                    <Text style={styles.appointmentTime}>
                      {patient.latestAppointment?.status || (patient.lastAppointment?.isCompleted ? "Confirmed" : "Scheduled")} • {patient.latestAppointment?.time || patient.lastAppointment?.slotTime || "N/A"}
                    </Text>
                    {renderStatusBadge(patient)}
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>TOTAL VISITS</Text>
                    <Text style={styles.visitsCount}>
                      {patient.totalAppointments || patient.appointments?.length || patient.totalVisits || 0}
                    </Text>
                    <Text style={styles.completedCount}>
                      {patient.completedAppointments || patient.completedVisits || 0} completed
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.viewDetailsButton} onPress={() => openDetailsModal(patient)}>
                  <Eye color="#4A9B7F" size={16} />
                  <Text style={styles.viewDetailsText}>View Details</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Period Modal */}
      <Modal visible={periodModalVisible} transparent animationType="fade" onRequestClose={() => setPeriodModalVisible(false)}>
        <TouchableOpacity style={styles.periodModalOverlay} activeOpacity={1} onPress={() => setPeriodModalVisible(false)}>
          <View style={styles.periodModalContent}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.periodOption, selectedPeriod === period && styles.periodOptionSelected]}
                onPress={() => { setSelectedPeriod(period); setPeriodModalVisible(false); }}
              >
                <Text style={[styles.periodOptionText, selectedPeriod === period && styles.periodOptionTextSelected]}>
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Details Modal */}
      <Modal visible={detailsModalVisible} transparent animationType="slide" onRequestClose={closeDetailsModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            
            <ScrollView showsVerticalScrollIndicator={false} bounces={true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Patient Details</Text>
                <TouchableOpacity style={styles.closeButton} onPress={closeDetailsModal}>
                  <X color="#6B7280" size={20} />
                </TouchableOpacity>
              </View>

              {selectedPatient && (
                <>
                  <View style={styles.patientInfoSection}>
                    <View style={styles.patientAvatarLarge}>
                      <Text style={styles.avatarTextLarge}>
                        {(selectedPatient.name || "P").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.patientNameLarge}>{selectedPatient.name || "N/A"}</Text>
                    <Text style={styles.patientEmailLarge}>{selectedPatient.email || "N/A"}</Text>
                    
                    <View style={styles.patientContactRow}>
                      <Phone color="#6B7280" size={14} />
                      <Text style={styles.patientContactText}>{selectedPatient.phone || "0000000000"}</Text>
                    </View>
                    <View style={styles.patientContactRow}>
                      <Mail color="#6B7280" size={14} />
                      <Text style={styles.patientContactText}>{selectedPatient.email || "N/A"}</Text>
                    </View>
                    <View style={styles.patientContactRow}>
                      <MapPin color="#6B7280" size={14} />
                      <Text style={styles.patientContactText}>
                        {typeof selectedPatient.address === 'object' 
                          ? [selectedPatient.address?.line1, selectedPatient.address?.line2].filter(Boolean).join(', ') || "Not Selected"
                          : selectedPatient.address || "Not Selected"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.sectionTitle}>Appointment Statistics</Text>
                  <View style={styles.statsGrid}>
                    <View style={[styles.statsCard, { backgroundColor: "#EEF2FF" }]}>
                      <View style={styles.statsCardHeader}>
                        <Calendar color="#4F46E5" size={16} />
                        <Text style={styles.statsCardLabel}>Total</Text>
                      </View>
                      <Text style={[styles.statsCardValue, { color: "#4F46E5" }]}>
                        {selectedPatient.totalAppointments || selectedPatient.appointments?.length || selectedPatient.totalVisits || 0}
                      </Text>
                    </View>
                    <View style={[styles.statsCard, { backgroundColor: "#ECFDF5" }]}>
                      <View style={styles.statsCardHeader}>
                        <CheckCircle color="#10B981" size={16} />
                        <Text style={styles.statsCardLabel}>Completed</Text>
                      </View>
                      <Text style={[styles.statsCardValue, { color: "#10B981" }]}>
                        {selectedPatient.completedAppointments || selectedPatient.completedVisits || 0}
                      </Text>
                    </View>
                    <View style={[styles.statsCard, { backgroundColor: "#FEF3C7" }]}>
                      <View style={styles.statsCardHeader}>
                        <Clock color="#F59E0B" size={16} />
                        <Text style={styles.statsCardLabel}>Pending</Text>
                      </View>
                      <Text style={[styles.statsCardValue, { color: "#F59E0B" }]}>
                        {selectedPatient.pendingAppointments || 0}
                      </Text>
                    </View>
                    <View style={[styles.statsCard, { backgroundColor: "#FEE2E2" }]}>
                      <View style={styles.statsCardHeader}>
                        <XCircle color="#EF4444" size={16} />
                        <Text style={styles.statsCardLabel}>Cancelled</Text>
                      </View>
                      <Text style={[styles.statsCardValue, { color: "#EF4444" }]}>
                        {selectedPatient.cancelledAppointments || 0}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.amountCard}>
                    <View style={styles.amountHeader}>
                      <DollarSign color="#1F2937" size={18} />
                      <Text style={styles.amountLabel}>Total Amount</Text>
                    </View>
                    <Text style={styles.amountValue}>₹{selectedPatient.totalAmount || 0}</Text>
                  </View>

                  <View style={styles.latestAppointmentCard}>
                    <Text style={styles.latestAppointmentTitle}>Latest Appointment</Text>
                    <View style={styles.latestAppointmentRow}>
                      <Text style={styles.latestLabel}>Date:</Text>
                      <Text style={styles.latestValue}>
                        {selectedPatient.latestAppointment?.date || "N/A"}
                      </Text>
                    </View>
                    <View style={styles.latestAppointmentRow}>
                      <Text style={styles.latestLabel}>Time:</Text>
                      <Text style={styles.latestValue}>
                        {selectedPatient.latestAppointment?.time || "N/A"}
                      </Text>
                    </View>
                    <View style={styles.latestAppointmentRow}>
                      <Text style={styles.latestLabel}>Amount:</Text>
                      <Text style={styles.latestValue}>
                        ₹{selectedPatient.latestAppointment?.amount || 0}
                      </Text>
                    </View>
                    <View style={styles.latestAppointmentRow}>
                      <Text style={styles.latestLabel}>Status:</Text>
                      {renderStatusBadge(selectedPatient)}
                    </View>
                  </View>

                  <Text style={styles.actionsTitle}>Actions</Text>

                  <TouchableOpacity
                    style={styles.moodButton}
                    onPress={() => loadMoodData(selectedPatient)}
                    disabled={moodLoading}
                  >
                    {moodLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <BarChart3 color="#FFFFFF" size={18} />
                        <Text style={styles.moodButtonText}>View Mood Data</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.modalCloseButton} onPress={closeDetailsModal}>
                    <Text style={styles.modalCloseButtonText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Mood Data Modal */}
      <Modal visible={moodModalVisible} transparent animationType="slide" onRequestClose={() => setMoodModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.moodModalContent}>
            <View style={styles.dragHandle} />
            
            <ScrollView showsVerticalScrollIndicator={false} bounces={true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Patient Mood Data</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setMoodModalVisible(false)}>
                  <X color="#6B7280" size={20} />
                </TouchableOpacity>
              </View>

              <View style={styles.moodPeriodRow}>
                {["Week", "Month", "Quarter", "Year"].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[styles.moodPeriodTab, moodPeriod === period && styles.moodPeriodTabActive]}
                    onPress={() => {
                      setMoodPeriod(period);
                      if (moodData?.patient) loadMoodData(moodData.patient);
                    }}
                  >
                    <Text style={[styles.moodPeriodText, moodPeriod === period && styles.moodPeriodTextActive]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(moodData?.patient || selectedPatient) && (
                <View style={styles.moodPatientCard}>
                  <View style={styles.moodAvatar}>
                    <Text style={styles.moodAvatarText}>
                      {((moodData?.patient || selectedPatient)?.name || "P").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.moodPatientName}>{(moodData?.patient || selectedPatient)?.name || "Patient"}</Text>
                    <Text style={styles.moodPatientInfo}>
                      ✉️ {(moodData?.patient || selectedPatient)?.email || "N/A"} • 📞 {(moodData?.patient || selectedPatient)?.phone || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.trackingEnabled}>
                    <CheckCircle color="#4A9B7F" size={14} />
                    <Text style={styles.trackingEnabledText}>Mood Tracking</Text>
                  </View>
                </View>
              )}

              <View style={styles.moodStatsRow}>
                <View style={styles.moodStatCard}>
                  <Text style={styles.moodStatLabel}>Average Mood</Text>
                  <Text style={styles.moodStatValue}>{moodData?.analytics?.averageMood?.toFixed(1) || "0.0"}</Text>
                  <View style={styles.trendRow}>
                    {(moodData?.analytics?.averageMood >= 3) ? (
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
                  <Text style={styles.moodStatValue}>{moodData?.entries?.length || 0}</Text>
                  <Text style={styles.moodStatSub}>Last {moodPeriod === "Week" ? "7" : moodPeriod === "Month" ? "30" : moodPeriod === "Quarter" ? "90" : "365"} days</Text>
                </View>
                <View style={styles.moodStatCard}>
                  <Text style={styles.moodStatLabel}>AI Analysis</Text>
                  <Text style={styles.moodStatValue}>{moodData?.analytics?.aiAnalysis ? "Yes" : "None"}</Text>
                  <Text style={styles.moodStatSub}>No consent</Text>
                </View>
              </View>

              <View style={styles.entriesSection}>
                <View style={styles.entriesHeader}>
                  <Text style={styles.entriesTitle}>Recent Mood Entries</Text>
                  <TouchableOpacity style={styles.refreshBtn} onPress={() => moodData?.patient && loadMoodData(moodData.patient)}>
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
  headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#E8F5F0", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  title: { fontSize: 24, fontWeight: "800", color: "#1F2937", marginBottom: 2 },
  subtitle: { fontSize: 14, color: "#6B7280" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#6B7280" },
  filterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  periodSelector: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  periodText: { fontSize: 13, color: "#1F2937", marginRight: 6 },
  dropdownArrow: { fontSize: 10, color: "#6B7280" },
  downloadButtons: { flexDirection: "row", gap: 8 },
  pdfButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#EF4444", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  excelButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#10B981", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  downloadButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  emptyState: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 32, alignItems: "center", elevation: 2 },
  emptyStateText: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginTop: 12 },
  emptyStateSubtext: { fontSize: 13, color: "#6B7280" },
  list: { gap: 12 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, elevation: 2, position: "relative" },
  patientNumberBadge: { position: "absolute", top: 12, right: 12, backgroundColor: "#E8F5F0", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  patientNumber: { fontSize: 11, fontWeight: "600", color: "#4A9B7F" },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#1F2937", alignItems: "center", justifyContent: "center", marginRight: 10 },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 2 },
  patientEmail: { fontSize: 12, color: "#6B7280" },
  detailsRow: { flexDirection: "row", marginBottom: 12 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 10, fontWeight: "600", color: "#9CA3AF", marginBottom: 3 },
  detailValue: { fontSize: 13, color: "#1F2937", fontWeight: "500" },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statsRow: { flexDirection: "row", gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6", marginBottom: 12 },
  statItem: { flex: 1 },
  statLabel: { fontSize: 10, fontWeight: "600", color: "#9CA3AF", marginBottom: 4 },
  statValue: { fontSize: 12, color: "#1F2937", fontWeight: "500" },
  appointmentInfo: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  appointmentTime: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  statusConfirmed: { backgroundColor: "#D1FAE5" },
  statusPending: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 10, fontWeight: "600", color: "#059669" },
  statusTextPending: { fontSize: 10, fontWeight: "600", color: "#D97706" },
  visitsCount: { fontSize: 22, fontWeight: "700", color: "#1F2937" },
  completedCount: { fontSize: 11, color: "#6B7280" },
  viewDetailsButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  viewDetailsText: { fontSize: 14, fontWeight: "600", color: "#4A9B7F" },

  periodModalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.3)", justifyContent: "center", alignItems: "center" },
  periodModalContent: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 8, width: 180 },
  periodOption: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 6 },
  periodOptionSelected: { backgroundColor: "#E8F5F0" },
  periodOptionText: { fontSize: 14, color: "#1F2937" },
  periodOptionTextSelected: { color: "#4A9B7F", fontWeight: "600" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%", paddingHorizontal: 16, paddingBottom: 20 },
  moodModalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%", paddingHorizontal: 16, paddingBottom: 20 },
  dragHandle: { width: 40, height: 4, backgroundColor: "#D1D5DB", borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },

  patientInfoSection: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 16, borderLeftWidth: 4, borderLeftColor: "#4A9B7F" },
  patientAvatarLarge: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#1F2937", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  avatarTextLarge: { fontSize: 24, fontWeight: "700", color: "#FFFFFF" },
  patientNameLarge: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 2 },
  patientEmailLarge: { fontSize: 13, color: "#6B7280", marginBottom: 10 },
  patientContactRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 3 },
  patientContactText: { fontSize: 13, color: "#4B5563" },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#4A9B7F", marginBottom: 12 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statsCard: { width: (width - 48) / 2 - 5, borderRadius: 12, padding: 12 },
  statsCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  statsCardLabel: { fontSize: 12, color: "#4B5563", fontWeight: "500" },
  statsCardValue: { fontSize: 24, fontWeight: "700" },

  amountCard: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 14, marginBottom: 16 },
  amountHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  amountLabel: { fontSize: 14, color: "#4B5563", fontWeight: "500" },
  amountValue: { fontSize: 24, fontWeight: "700", color: "#1F2937" },

  latestAppointmentCard: { backgroundColor: "#ECFDF5", borderRadius: 12, padding: 14, marginBottom: 16 },
  latestAppointmentTitle: { fontSize: 14, fontWeight: "700", color: "#059669", marginBottom: 10 },
  latestAppointmentRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  latestLabel: { fontSize: 13, color: "#4B5563", fontWeight: "500", width: 70 },
  latestValue: { fontSize: 13, color: "#1F2937", flex: 1 },

  actionsTitle: { fontSize: 14, fontWeight: "600", color: "#6B7280", marginBottom: 10 },

  moodButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#4A9B7F", paddingVertical: 14, borderRadius: 10, marginBottom: 12 },
  moodButtonText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },

  modalCloseButton: { backgroundColor: "#6B7280", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalCloseButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },

  moodPeriodRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  moodPeriodTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: "#F3F4F6" },
  moodPeriodTabActive: { backgroundColor: "#4A9B7F" },
  moodPeriodText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  moodPeriodTextActive: { color: "#FFFFFF" },

  moodPatientCard: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 12, flexWrap: "wrap" },
  moodAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1F2937", alignItems: "center", justifyContent: "center", marginRight: 10 },
  moodAvatarText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  moodPatientName: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  moodPatientInfo: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  trackingEnabled: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, width: "100%" },
  trackingEnabledText: { fontSize: 12, color: "#4A9B7F", fontWeight: "500" },

  moodStatsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  moodStatCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  moodStatLabel: { fontSize: 10, color: "#6B7280", marginBottom: 2 },
  moodStatValue: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  moodStatSub: { fontSize: 9, color: "#9CA3AF", marginTop: 2 },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  trendText: { fontSize: 10, fontWeight: "500" },

  entriesSection: { marginBottom: 12 },
  entriesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  entriesTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8F5F0", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  refreshText: { fontSize: 12, color: "#4A9B7F", fontWeight: "500" },

  moodEntry: { backgroundColor: "#FFFFFF", borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#F3F4F6" },
  moodEntryLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  moodEmoji: { fontSize: 26 },
  moodLabel: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  moodDate: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  moodEntryRight: { alignItems: "flex-end" },
  moodScore: { fontSize: 13, fontWeight: "600", color: "#1F2937" },
  moodActivity: { fontSize: 10, color: "#6B7280", marginTop: 2 },

  noEntries: { alignItems: "center", padding: 24 },
  noEntriesText: { fontSize: 14, color: "#9CA3AF", marginTop: 8 },
});

