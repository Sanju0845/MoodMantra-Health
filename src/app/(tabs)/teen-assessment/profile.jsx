import { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, ChevronRight, User, Mail, Calendar } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileSetup() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [age, setAge] = useState("");
    const [parentEmail, setParentEmail] = useState("");
    const [agreedToConsent, setAgreedToConsent] = useState(false);

    const validateAndProceed = async () => {
        // Validate age
        const ageNum = parseInt(age);
        if (!age || isNaN(ageNum) || ageNum < 13 || ageNum > 19) {
            Alert.alert("Invalid Age", "Please enter an age between 13 and 19.");
            return;
        }

        // Validate consent
        if (!agreedToConsent) {
            Alert.alert("Consent Required", "Please agree to the terms to continue.");
            return;
        }

        // Validate email (optional but if provided, must be valid)
        if (parentEmail && !parentEmail.includes("@")) {
            Alert.alert("Invalid Email", "Please enter a valid email address or leave it blank.");
            return;
        }

        // Save profile data
        try {
            const profile = {
                age: ageNum,
                parentEmail: parentEmail || null,
                startedAt: new Date().toISOString(),
            };

            await AsyncStorage.setItem("teenAssessmentProfile", JSON.stringify(profile));

            // Initialize progress
            const progress = {
                currentModule: "A",
                completed: [],
                isComplete: false,
            };

            await AsyncStorage.setItem("teenAssessmentProgress", JSON.stringify(progress));

            // Navigate to first module
            router.push({
                pathname: "/(tabs)/teen-assessment/module",
                params: { module: "A" },
            });
        } catch (error) {
            console.error("Error saving profile:", error);
            Alert.alert("Error", "Failed to save your information. Please try again.");
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <LinearGradient
                colors={["#FF6B6B", "#FF8E53"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.header, { paddingTop: insets.top + 12 }]}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Let's Get Started</Text>
                <View style={{ width: 40 }} />
            </LinearGradient>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: insets.bottom + 140 },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Welcome Message */}
                    <View style={styles.welcomeCard}>
                        <User size={48} color="#FF6B6B" strokeWidth={1.5} />
                        <Text style={styles.welcomeTitle}>Welcome to Your Journey</Text>
                        <Text style={styles.welcomeText}>
                            We need a few details to personalize your assessment experience.
                        </Text>
                    </View>

                    {/* Age Input */}
                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>Your Age *</Text>
                        <Text style={styles.inputHint}>Must be between 13-19 years old</Text>
                        <View style={styles.inputContainer}>
                            <Calendar size={20} color="#9CA3AF" strokeWidth={2} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your age"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="number-pad"
                                value={age}
                                onChangeText={setAge}
                                maxLength={2}
                            />
                        </View>
                    </View>

                    {/* Parent Email Input */}
                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>Parent/Guardian Email</Text>
                        <Text style={styles.inputHint}>Optional - for sharing results</Text>
                        <View style={styles.inputContainer}>
                            <Mail size={20} color="#9CA3AF" strokeWidth={2} />
                            <TextInput
                                style={styles.input}
                                placeholder="parent@example.com"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={parentEmail}
                                onChangeText={setParentEmail}
                            />
                        </View>
                    </View>

                    {/* Consent Section */}
                    <View style={styles.consentSection}>
                        <Text style={styles.consentTitle}>Before We Begin</Text>

                        <View style={styles.consentBox}>
                            <Text style={styles.consentText}>
                                <Text style={styles.consentBold}>This assessment will help you:{"\n"}</Text>
                                • Understand your natural interests{"\n"}
                                • Discover how your brain works{"\n"}
                                • Identify your current skills{"\n"}
                                • Recognize what energizes or drains you{"\n\n"}

                                <Text style={styles.consentBold}>This is NOT:{"\n"}</Text>
                                • A medical or psychological diagnosis{"\n"}
                                • An IQ test or ranking system{"\n"}
                                • A job prediction or career lock-in{"\n\n"}

                                <Text style={styles.consentBold}>Your data:{"\n"}</Text>
                                • Stored locally on your device{"\n"}
                                • Never shared without permission{"\n"}
                                • Can be deleted anytime
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.checkboxContainer}
                            onPress={() => setAgreedToConsent(!agreedToConsent)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.checkbox,
                                agreedToConsent && styles.checkboxChecked
                            ]}>
                                {agreedToConsent && (
                                    <Text style={styles.checkmark}>✓</Text>
                                )}
                            </View>
                            <Text style={styles.checkboxLabel}>
                                I understand and agree to proceed
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Start Button */}
                    <TouchableOpacity
                        style={[
                            styles.startButton,
                            (!age || !agreedToConsent) && styles.startButtonDisabled
                        ]}
                        onPress={validateAndProceed}
                        disabled={!age || !agreedToConsent}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={
                                age && agreedToConsent
                                    ? ["#FF6B6B", "#FF8E53"]
                                    : ["#D1D5DB", "#9CA3AF"]
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.startButtonGradient}
                        >
                            <Text style={styles.startButtonText}>Begin Assessment</Text>
                            <ChevronRight size={22} color="#FFFFFF" strokeWidth={2.5} />
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 16,
        shadowColor: "#FF6B6B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.18)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.25)",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: -0.3,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 24,
        paddingHorizontal: 20,
    },
    welcomeCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 28,
        marginBottom: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    welcomeTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1F2937",
        marginTop: 16,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    welcomeText: {
        fontSize: 15,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 22,
    },
    inputSection: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 4,
    },
    inputHint: {
        fontSize: 13,
        color: "#9CA3AF",
        marginBottom: 10,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 2,
        borderColor: "#F3F4F6",
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: "#1F2937",
        fontWeight: "500",
    },
    consentSection: {
        marginBottom: 24,
    },
    consentTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 12,
    },
    consentBox: {
        backgroundColor: "#F0FDFA",
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: "#14B8A6",
    },
    consentText: {
        fontSize: 13,
        color: "#134E4A",
        lineHeight: 20,
    },
    consentBold: {
        fontWeight: "700",
        color: "#0F766E",
    },
    checkboxContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#D1D5DB",
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxChecked: {
        backgroundColor: "#10B981",
        borderColor: "#10B981",
    },
    checkmark: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
    checkboxLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
    },
    startButton: {
        marginTop: 8,
        marginBottom: 24,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    startButtonDisabled: {
        shadowOpacity: 0.05,
        elevation: 2,
    },
    startButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 18,
        paddingHorizontal: 24,
        gap: 12,
    },
    startButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 0.3,
    },
});
