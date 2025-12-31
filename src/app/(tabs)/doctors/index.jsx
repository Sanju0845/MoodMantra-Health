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
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import api from "../../../utils/api";

// Modern Doctor Card Component
function ModernDoctorCard({ doctor, onPress }) {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
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
                activeOpacity={0.9}
                style={styles.doctorCard}
            >
                <Image
                    source={{ uri: doctor.image || "https://via.placeholder.com/80" }}
                    style={styles.doctorImage}
                />

                <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>{doctor.name}</Text>

                    {/* Specialty/Degree - Show degree or specialty */}
                    {(doctor.degree || doctor.specialty || doctor.specialization) && (
                        <Text style={styles.doctorSpecialty}>
                            {doctor.degree || doctor.specialty || doctor.specialization}
                        </Text>
                    )}

                    {/* Qualifications - Show if exists */}
                    {((doctor.qualifications && doctor.qualifications.length > 0) || doctor.qualification) && (
                        <Text style={styles.doctorQualifications} numberOfLines={2}>
                            {doctor.qualifications && doctor.qualifications.length > 0
                                ? (Array.isArray(doctor.qualifications)
                                    ? doctor.qualifications.join(' • ')
                                    : doctor.qualifications)
                                : doctor.qualification}
                        </Text>
                    )}

                    <View style={styles.doctorStats}>
                        <View style={styles.statItem}>
                            <Star size={14} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.statText}>{doctor.rating || "4.8"}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <MapPin size={14} color="#6B7280" />
                            <Text style={styles.statText}>{doctor.location || "Online"}</Text>
                        </View>
                    </View>

                    {doctor.available && (
                        <View style={styles.availableBadge}>
                            <View style={styles.dot} />
                            <Text style={styles.availableText}>Available Now</Text>
                        </View>
                    )}
                </View>

                <View style={styles.arrowContainer}>
                    <ChevronRight size={20} color="#4A9B7F" />
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
            <StatusBar style="light" />

            {/* Fixed Header */}
            <LinearGradient
                colors={["#4A9B7F", "#3B8068", "#2D6B56"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 10 }]}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <View style={styles.iconContainer}>
                            <Stethoscope size={22} color="#FFFFFF" strokeWidth={2} />
                        </View>
                        <View style={styles.headerTextContainer}>
                            <View style={styles.titleRow}>
                                <Text style={styles.headerTitle}>Find Care</Text>
                                <TouchableOpacity
                                    style={styles.mapIconButton}
                                    onPress={handleMapPress}
                                    activeOpacity={0.7}
                                >
                                    <Map size={20} color="#FFFFFF" strokeWidth={2.5} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.headerSubtitle}>
                                Professional support when you need it
                            </Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Doctors List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <Text style={styles.sectionTitle}>Available Therapists</Text>
                <Text style={styles.sectionSubtitle}>
                    Connect with licensed mental health professionals
                </Text>

                {doctors.map((doctor) => (
                    <ModernDoctorCard
                        key={doctor._id}
                        doctor={doctor}
                        onPress={() => handleDoctorPress(doctor)}
                    />
                ))}

                {doctors.length === 0 && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Stethoscope size={48} color="#D1D5DB" />
                        </View>
                        <Text style={styles.emptyTitle}>No therapists available</Text>
                        <Text style={styles.emptySubtitle}>Check back later for available professionals</Text>
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
        backgroundColor: "#F9FAFB",
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        paddingBottom: 12,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: "#4A9B7F",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    headerContent: {
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    mapIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255, 255, 255, 0.25)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.9)",
        marginTop: 2,
        fontWeight: "500",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 28,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 15,
        color: "#6B7280",
        marginBottom: 24,
        lineHeight: 22,
    },
    doctorCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    doctorImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginRight: 16,
    },
    doctorInfo: {
        flex: 1,
    },
    doctorName: {
        fontSize: 17,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 4,
    },
    doctorSpecialty: {
        fontSize: 14,
        color: "#4B5563",
        marginBottom: 4,
        fontWeight: "500",
    },
    doctorQualifications: {
        fontSize: 13,
        color: "#4A9B7F",
        marginBottom: 10,
        fontWeight: "600",
        lineHeight: 18,
    },
    doctorStats: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 8,
    },
    statItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    statText: {
        fontSize: 13,
        color: "#6B7280",
    },
    availableBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#10B981",
    },
    availableText: {
        fontSize: 12,
        color: "#10B981",
        fontWeight: "600",
    },
    arrowContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 12,
    },
    emptyState: {
        paddingVertical: 60,
        alignItems: "center",
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: "#1F2937",
    },
    emptySubtitle: {
        fontSize: 15,
        color: "#6B7280",
        marginTop: 8,
    },
});
