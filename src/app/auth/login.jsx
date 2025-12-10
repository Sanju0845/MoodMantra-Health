import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    Image,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Mail, Lock, Eye, EyeOff } from "lucide-react-native";
import api from "../../utils/api";
import { useAuthStore } from "../../utils/auth/store";
import { colors, spacing, borderRadius, fontSize, fontWeight, shadow } from "../../utils/theme";

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
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar style="light" />

            {/* Header with gradient */}
            <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={{
                    paddingTop: insets.top + spacing.xl,
                    paddingBottom: spacing.xxl,
                    paddingHorizontal: spacing.lg,
                    borderBottomLeftRadius: borderRadius.xl,
                    borderBottomRightRadius: borderRadius.xl,
                }}
            >
                <View style={{ alignItems: "center" }}>
                    <Text
                        style={{
                            fontSize: fontSize.xxxl,
                            fontWeight: fontWeight.bold,
                            color: colors.textWhite,
                            marginBottom: spacing.xs,
                        }}
                    >
                        MoodMantra
                    </Text>
                    <Text
                        style={{
                            fontSize: fontSize.md,
                            color: colors.textWhite,
                            opacity: 0.9,
                        }}
                    >
                        Your Mental Wellness Companion
                    </Text>
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingHorizontal: spacing.lg,
                    paddingTop: spacing.xl,
                    paddingBottom: insets.bottom + spacing.lg,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Welcome Text */}
                <View style={{ marginBottom: spacing.xl }}>
                    <Text
                        style={{
                            fontSize: fontSize.xxl,
                            fontWeight: fontWeight.bold,
                            color: colors.textDark,
                            marginBottom: spacing.xs,
                        }}
                    >
                        Welcome Back
                    </Text>
                    <Text style={{ fontSize: fontSize.md, color: colors.textMedium }}>
                        Login to continue your wellness journey
                    </Text>
                </View>

                {/* Email Input */}
                <View style={{ marginBottom: spacing.md }}>
                    <Text
                        style={{
                            fontSize: fontSize.sm,
                            fontWeight: fontWeight.semibold,
                            color: colors.textDark,
                            marginBottom: spacing.sm,
                        }}
                    >
                        Email Address
                    </Text>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: colors.cardBackground,
                            borderRadius: borderRadius.md,
                            borderWidth: 1,
                            borderColor: colors.border,
                            paddingHorizontal: spacing.md,
                            ...shadow.sm,
                        }}
                    >
                        <Mail color={colors.textLight} size={20} />
                        <TextInput
                            style={{
                                flex: 1,
                                paddingVertical: spacing.md,
                                paddingHorizontal: spacing.sm,
                                fontSize: fontSize.md,
                                color: colors.textDark,
                            }}
                            placeholder="Enter your email"
                            placeholderTextColor={colors.textLight}
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
                <View style={{ marginBottom: spacing.lg }}>
                    <Text
                        style={{
                            fontSize: fontSize.sm,
                            fontWeight: fontWeight.semibold,
                            color: colors.textDark,
                            marginBottom: spacing.sm,
                        }}
                    >
                        Password
                    </Text>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: colors.cardBackground,
                            borderRadius: borderRadius.md,
                            borderWidth: 1,
                            borderColor: colors.border,
                            paddingHorizontal: spacing.md,
                            ...shadow.sm,
                        }}
                    >
                        <Lock color={colors.textLight} size={20} />
                        <TextInput
                            style={{
                                flex: 1,
                                paddingVertical: spacing.md,
                                paddingHorizontal: spacing.sm,
                                fontSize: fontSize.md,
                                color: colors.textDark,
                            }}
                            placeholder="Enter your password"
                            placeholderTextColor={colors.textLight}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            editable={!loading}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            {showPassword ? (
                                <EyeOff color={colors.textLight} size={20} />
                            ) : (
                                <Eye color={colors.textLight} size={20} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Login Button */}
                <TouchableOpacity
                    style={{
                        backgroundColor: colors.primary,
                        borderRadius: borderRadius.md,
                        paddingVertical: spacing.md,
                        alignItems: "center",
                        marginBottom: spacing.md,
                        opacity: loading ? 0.7 : 1,
                        ...shadow.md,
                    }}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.textWhite} />
                    ) : (
                        <Text
                            style={{
                                color: colors.textWhite,
                                fontSize: fontSize.md,
                                fontWeight: fontWeight.semibold,
                            }}
                        >
                            Login
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Divider */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginVertical: spacing.lg,
                    }}
                >
                    <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                    <Text
                        style={{
                            paddingHorizontal: spacing.md,
                            color: colors.textLight,
                            fontSize: fontSize.sm,
                        }}
                    >
                        or
                    </Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                </View>

                {/* Register Link */}
                <TouchableOpacity
                    style={{
                        borderWidth: 1,
                        borderColor: colors.primary,
                        borderRadius: borderRadius.md,
                        paddingVertical: spacing.md,
                        alignItems: "center",
                        marginBottom: spacing.lg,
                    }}
                    onPress={() => router.push("/auth/register")}
                    disabled={loading}
                    activeOpacity={0.7}
                >
                    <Text
                        style={{
                            color: colors.primary,
                            fontSize: fontSize.md,
                            fontWeight: fontWeight.semibold,
                        }}
                    >
                        Create New Account
                    </Text>
                </TouchableOpacity>

                {/* Footer */}
                <View style={{ alignItems: "center" }}>
                    <Text style={{ color: colors.textLight, fontSize: fontSize.sm }}>
                        By logging in, you agree to our Terms of Service
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}
