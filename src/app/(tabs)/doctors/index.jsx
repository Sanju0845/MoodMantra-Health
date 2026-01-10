import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
    Star,
    MapPin,
    ChevronRight,
    Stethoscope,
    Map,
    Award,
    Clock,
    BadgeCheck,
    Calendar,
    MessageCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import api from "../../../utils/api";

// Professional Doctor Card Component
function ProfessionalDoctorCard({ doctor, onPress }) {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.98,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.95}
                style={styles.doctorCard}
            >
                {/* Top Row: Image + Key Info */}
                <View style={styles.topRow}>
                    {/* Doctor Image Container with Verified Badge */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: doctor.image || "https://via.placeholder.com/100" }}
                            style={styles.doctorImage}
                        />
                        {/* Verified Badge */}
                        <View style={styles.verifiedBadge}>
                            <BadgeCheck size={16} color="#FFFFFF" fill="#3B82F6" />
                        </View>
                    </View>

                    {/* Key Info Next to Image */}
                    <View style={styles.keyInfo}>
                        {/* Name and Rating Row */}
                        <Text style={styles.doctorName} numberOfLines={2}>
                            {doctor.name}
                        </Text>

                        {/* Specialty/Degree */}
                        {(doctor.degree || doctor.specialty || doctor.specialization) && (
                            <Text style={styles.doctorSpecialty} numberOfLines={1}>
                                {doctor.degree || doctor.specialty || doctor.specialization}
                            </Text>
                        )}

                        {/* Rating Badge */}
                        <View style={styles.ratingBadge}>
                            <Star size={12} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.ratingText}>{doctor.rating || "N/A"}</Text>
                            <Text style={styles.patientsText}>
                                ({doctor.patients_treated ? `${doctor.patients_treated}+` : "200+"})
                            </Text>
                        </View>

                        {/* Experience */}
                        <View style={styles.experienceBadge}>
                            <Award size={12} color="#4A9B7F" />
                            <Text style={styles.experienceText}>
                                {doctor.experience ? `${doctor.experience} yrs` : "5+ yrs"} exp
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Doctor Information Below */}
                <View style={styles.doctorInfo}>
                    {/* Qualifications */}
                    {((doctor.qualifications && doctor.qualifications.length > 0) || doctor.qualification) && (
                        <Text style={styles.doctorQualifications} numberOfLines={2}>
                            {doctor.qualifications && doctor.qualifications.length > 0
                                ? (Array.isArray(doctor.qualifications)
                                    ? doctor.qualifications.join(' • ')
                                    : doctor.qualifications)
                                : doctor.qualification}
                        </Text>
                    )}

                    {/* Languages Spoken */}
                    {(doctor.languages || doctor.languageSpoken) && (
                        <View style={styles.languagesRow}>
                            <MessageCircle size={12} color="#6B7280" />
                            <Text style={styles.languagesText} numberOfLines={1}>
                                {doctor.languages || doctor.languageSpoken || "English, Hindi"}
                            </Text>
                        </View>
                    )}

                    {/* Location and Availability */}
                    <View style={styles.bottomRow}>
                        <View style={styles.locationContainer}>
                            <MapPin size={12} color="#6B7280" />
                            <Text style={styles.locationText} numberOfLines={1}>
                                {doctor.location || "Online Consultation"}
                            </Text>
                        </View>

                        {doctor.available && (
                            <View style={styles.availableBadge}>
                                <View style={styles.dot} />
                                <Text style={styles.availableText}>Available</Text>
                            </View>
                        )}
                    </View>

                    {/* Consultation Fee & Next Available */}
                    <View style={styles.consultationRow}>
                        <View style={styles.feeContainer}>
                            <Text style={styles.feeLabel}>Consultation Fee</Text>
                            <Text style={styles.feeAmount}>
                                ₹{doctor.consultation_fee || doctor.consultationFee || doctor.fees || doctor.price || 500}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.bookButton} onPress={onPress}>
                            <Calendar size={14} color="#FFFFFF" />
                            <Text style={styles.bookButtonText}>Book Now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function DoctorsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadDoctors();
    }, []);

    const loadDoctors = async () => {
        try {
            const response = await api.getDoctors();
            if (response.success && Array.isArray(response.doctors)) {
                setDoctors(response.doctors);
            }
        } catch (error) {
            console.error("Error loading doctors:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadDoctors();
    };

    const handleMapPress = async () => {
        await Haptics.selectionAsync();
        router.push("/doctors/nearme");
    };

    const handleDoctorPress = async (doctor) => {
        await Haptics.selectionAsync();
        router.push(`/doctors/${doctor._id}`);
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#4A9B7F" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Clean Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Doctors</Text>
                    <Text style={styles.headerSubtitle}>Licensed mental health professionals</Text>
                </View>
            </View>

            {/* Divider Line */}
            <View style={styles.headerDivider} />

            {/* Doctors List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#4A9B7F"
                        colors={["#4A9B7F"]}
                    />
                }
            >
                {/* Section Title */}
                <View style={styles.sectionTitleContainer}>
                    <Text style={styles.sectionTitle}>Available Specialists</Text>
                    <Text style={styles.sectionSubtitle}>
                        {doctors.length} verified professionals
                    </Text>
                </View>

                {/* Divider */}
                <View style={styles.contentDivider} />

                {/* Doctor Cards */}
                {doctors.map((doctor, index) => (
                    <React.Fragment key={doctor._id || index}>
                        <ProfessionalDoctorCard
                            doctor={doctor}
                            onPress={() => handleDoctorPress(doctor)}
                        />
                        {/* Divider between cards */}
                        {index < doctors.length - 1 && (
                            <View style={styles.cardDivider} />
                        )}
                    </React.Fragment>
                ))}

                {/* Empty State */}
                {doctors.length === 0 && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Stethoscope size={56} color="#9CA3AF" strokeWidth={1.5} />
                        </View>
                        <Text style={styles.emptyTitle}>No specialists available</Text>
                        <Text style={styles.emptySubtitle}>
                            Check back later for available professionals
                        </Text>
                        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                            <Text style={styles.refreshButtonText}>Refresh</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        backgroundColor: "#FFFFFF",
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerContent: {
        paddingHorizontal: 24,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: "700",
        color: "#1F2937",
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 15,
        color: "#6B7280",
        fontWeight: "500",
    },
    headerDivider: {
        height: 1,
        backgroundColor: "#E5E7EB",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    sectionTitleContainer: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: "#6B7280",
        fontWeight: "500",
    },
    contentDivider: {
        height: 1,
        backgroundColor: "#E5E7EB",
        marginBottom: 20,
    },
    cardDivider: {
        height: 1,
        backgroundColor: "#F3F4F6",
        marginVertical: 12,
    },
    doctorCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    imageContainer: {
        position: "relative",
        alignSelf: "flex-start",
        marginBottom: 14,
    },
    doctorImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: "#F3F4F6",
    },
    verifiedBadge: {
        position: "absolute",
        bottom: 2,
        right: 2,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
        marginBottom: 14,
    },
    keyInfo: {
        flex: 1,
        gap: 6,
    },
    experienceBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "#F0FDF4",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        alignSelf: "flex-start",
    },
    experienceText: {
        fontSize: 12,
        color: "#4A9B7F",
        fontWeight: "600",
    },
    patientsText: {
        fontSize: 11,
        color: "#6B7280",
        fontWeight: "500",
    },
    doctorInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    doctorName: {
        fontSize: 19,
        fontWeight: "700",
        color: "#111827",
        flex: 1,
        marginRight: 8,
    },
    ratingBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#D97706",
    },
    doctorSpecialty: {
        fontSize: 15,
        color: "#4A9B7F",
        marginBottom: 5,
        fontWeight: "600",
    },
    doctorQualifications: {
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 12,
        lineHeight: 19,
        fontWeight: "500",
    },
    statsRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 12,
    },
    statPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        gap: 5,
    },
    statPillText: {
        fontSize: 12,
        color: "#4B5563",
        fontWeight: "600",
    },
    languagesRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 10,
        marginBottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#F9FAFB",
        borderRadius: 8,
    },
    languagesText: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "500",
        flex: 1,
    },
    bottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    locationContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        flex: 1,
    },
    locationText: {
        fontSize: 13,
        color: "#6B7280",
        fontWeight: "500",
    },
    availableBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#D1FAE5",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        gap: 5,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#10B981",
    },
    availableText: {
        fontSize: 11,
        color: "#059669",
        fontWeight: "700",
    },
    consultationRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    feeContainer: {
        flex: 1,
    },
    feeLabel: {
        fontSize: 11,
        color: "#9CA3AF",
        fontWeight: "600",
        marginBottom: 2,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    feeAmount: {
        fontSize: 18,
        fontWeight: "800",
        color: "#4A9B7F",
    },
    bookButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#4A9B7F",
        paddingHorizontal: 20,
        paddingVertical: 11,
        borderRadius: 12,
        gap: 6,
        shadowColor: "#4A9B7F",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    bookButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    emptyState: {
        paddingVertical: 80,
        alignItems: "center",
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 19,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: "#6B7280",
        textAlign: "center",
        marginBottom: 24,
    },
    refreshButton: {
        backgroundColor: "#4A9B7F",
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 12,
    },
    refreshButtonText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#FFFFFF",
    },
});
