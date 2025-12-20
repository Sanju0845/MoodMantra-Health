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
    Image,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react-native";
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
            // Try doctor login first (silently catch errors)
            try {
                console.log("[Login] Attempting doctor login...");
                const doctorResponse = await api.doctorLogin(trimmedEmail, trimmedPassword);

                if (doctorResponse.success && doctorResponse.token) {
                    // Doctor login successful
                    console.log("[Login] Doctor login successful");
                    setToken(doctorResponse.token);
                    await AsyncStorage.setItem("userType", "doctor");
                    router.replace("/doctor");
                    return;
                }
            } catch (doctorError) {
                // Silently catch doctor login errors - user might be a regular user
                console.log("[Login] Doctor login failed, trying user login...");
            }

            // Try user login
            try {
                console.log("[Login] Attempting user login...");
                const response = await api.login(trimmedEmail, trimmedPassword);

                if (response.success && response.token) {
                    console.log("[Login] User login successful");
                    setToken(response.token);
                    await AsyncStorage.setItem("userType", "user");

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
                    throw new Error(response.message || "Login failed");
                }
            } catch (userError) {
                // Both logins failed - show generic error
                console.error("[Login] Both login attempts failed");
                Alert.alert(
                    "Login Failed",
                    "Invalid email or password. Please check your credentials and try again."
                );
            }
        } catch (error) {
            console.error("[Login] Unexpected error:", error);
            Alert.alert(
                "Login Failed",
                "Invalid email or password. Please check your credentials and try again."
            );
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
                        { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo & Branding */}
                    <View style={styles.headerSection}>
                        <Image
                            source={require("../../../assets/images/splash-icon.png")}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.brandName}>Raskamon</Text>
                        <Text style={styles.tagline}>Your Mental Wellness Companion</Text>
                    </View>

                    {/* Welcome Text */}
                    <View style={styles.welcomeSection}>
                        <Text style={styles.welcomeTitle}>Welcome Back</Text>
                        <Text style={styles.welcomeSubtitle}>
                            Sign in to continue your journey
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.formSection}>
                        {/* Email Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Email</Text>
                            <View style={styles.inputWrapper}>
                                <Mail color="#9CA3AF" size={20} />
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
                                <Lock color="#9CA3AF" size={20} />
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
                                    <Text style={styles.loginButtonText}>Sign In</Text>
                                    <ArrowRight color="#FFFFFF" size={20} />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Register Link */}
                    <View style={styles.registerSection}>
                        <Text style={styles.registerText}>Don't have an account? </Text>
                        <TouchableOpacity
                            onPress={() => router.push("/auth/register")}
                            disabled={loading}
                        >
                            <Text style={styles.registerLink}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            By signing in, you agree to our Terms of Service
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
        backgroundColor: "#E8F5F0",
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 28,
    },
    headerSection: {
        alignItems: "center",
        marginBottom: 40,
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 16,
    },
    brandName: {
        fontSize: 36,
        fontWeight: "800",
        color: "#1F2937",
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: 15,
        color: "#6B7280",
        fontWeight: "500",
    },
    welcomeSection: {
        marginBottom: 32,
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: "#6B7280",
    },
    formSection: {
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 10,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: "#1F2937",
    },
    eyeButton: {
        padding: 4,
    },
    forgotPassword: {
        alignSelf: "flex-end",
        marginBottom: 28,
    },
    forgotPasswordText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4A9B7F",
    },
    loginButton: {
        backgroundColor: "#1F2937",
        borderRadius: 16,
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        shadowColor: "#1F2937",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "700",
    },
    registerSection: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 32,
    },
    registerText: {
        color: "#6B7280",
        fontSize: 15,
    },
    registerLink: {
        color: "#4A9B7F",
        fontSize: 15,
        fontWeight: "700",
    },
    footer: {
        alignItems: "center",
    },
    footerText: {
        color: "#9CA3AF",
        fontSize: 13,
        textAlign: "center",
    },
});
