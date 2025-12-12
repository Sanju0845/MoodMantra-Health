import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react-native";
import api from "../../utils/api";
import { useAuthStore } from "../../utils/auth/store";

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { setToken, setUserData } = useAuthStore();

    const handleLogin = async () => {
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            Alert.alert("Error", "Please enter a valid email address");
            return;
        }

        setLoading(true);
        try {
            const response = await api.login(trimmedEmail, trimmedPassword);

            if (response.success && response.token) {
                setToken(response.token);

                try {
                    const profileResponse = await api.getProfile();
                    if (profileResponse.success && profileResponse.userData) {
                        await AsyncStorage.setItem("userId", profileResponse.userData._id);
                        setUserData(profileResponse.userData);
                    }
                } catch (profileError) {
                    console.error("[Login] Error getting profile:", profileError);
                }

                router.replace("/(tabs)/home");
            } else {
                Alert.alert("Error", response.message || "Login failed");
            }
        } catch (error) {
            console.error("[Login] Error:", error);
            Alert.alert("Login Failed", error.message || "Please check your credentials and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo & Branding */}
                    <View style={styles.headerSection}>
                        <View style={styles.logoContainer}>
                            <Sparkles size={32} color="#4A9B7F" />
                        </View>
                        <Text style={styles.brandName}>MoodMantra</Text>
                        <Text style={styles.tagline}>Your Mental Wellness Companion</Text>
                    </View>

                    {/* Welcome Card */}
                    <View style={styles.formCard}>
                        <Text style={styles.welcomeTitle}>Welcome Back! 👋</Text>
                        <Text style={styles.welcomeSubtitle}>
                            Login to continue your wellness journey
                        </Text>

                        {/* Email Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Email Address</Text>
                            <View style={styles.inputWrapper}>
                                <View style={styles.inputIconContainer}>
                                    <Mail color="#9CA3AF" size={20} />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    placeholderTextColor="#9CA3AF"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <View style={styles.inputIconContainer}>
                                    <Lock color="#9CA3AF" size={20} />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#9CA3AF"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeButton}
                                >
                                    {showPassword ? (
                                        <EyeOff color="#9CA3AF" size={20} />
                                    ) : (
                                        <Eye color="#9CA3AF" size={20} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Forgot Password */}
                        <TouchableOpacity style={styles.forgotPassword}>
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Text style={styles.loginButtonText}>Login</Text>
                                    <ArrowRight color="#FFFFFF" size={20} />
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Register Link */}
                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={() => router.push("/auth/register")}
                            disabled={loading}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.registerButtonText}>Create New Account</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            By logging in, you agree to our{" "}
                            <Text style={styles.footerLink}>Terms of Service</Text>
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
    },
    headerSection: {
        alignItems: "center",
        marginBottom: 32,
    },
    logoContainer: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: "#E6F4F0",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        shadowColor: "#4A9B7F",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    brandName: {
        fontSize: 32,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 6,
    },
    tagline: {
        fontSize: 15,
        color: "#6B7280",
        fontWeight: "500",
    },
    formCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
        marginBottom: 24,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 15,
        color: "#6B7280",
        marginBottom: 28,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
    },
    inputIconContainer: {
        paddingLeft: 16,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 12,
        fontSize: 16,
        color: "#1F2937",
    },
    eyeButton: {
        padding: 16,
    },
    forgotPassword: {
        alignSelf: "flex-end",
        marginBottom: 24,
    },
    forgotPasswordText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4A9B7F",
    },
    loginButton: {
        backgroundColor: "#4A9B7F",
        borderRadius: 14,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        shadowColor: "#4A9B7F",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
    divider: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: "#E5E7EB",
    },
    dividerText: {
        paddingHorizontal: 16,
        color: "#9CA3AF",
        fontSize: 14,
        fontWeight: "500",
    },
    registerButton: {
        borderWidth: 2,
        borderColor: "#4A9B7F",
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
    },
    registerButtonText: {
        color: "#4A9B7F",
        fontSize: 16,
        fontWeight: "700",
    },
    footer: {
        alignItems: "center",
    },
    footerText: {
        color: "#9CA3AF",
        fontSize: 13,
        textAlign: "center",
        lineHeight: 20,
    },
    footerLink: {
        color: "#4A9B7F",
        fontWeight: "600",
    },
});
