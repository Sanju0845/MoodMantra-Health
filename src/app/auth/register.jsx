import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import api from "../../utils/api";
import { useAuthStore } from "../../utils/auth/store";
import { colors, spacing, borderRadius, fontSize, fontWeight, shadow } from "../../utils/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { setToken, setUserData } = useAuthStore();

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (trimmedPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (trimmedPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const response = await api.register(trimmedName, trimmedEmail, trimmedPassword);

      if (response.success && response.token) {
        setToken(response.token);

        try {
          const profileResponse = await api.getProfile();
          if (profileResponse.success && profileResponse.userData) {
            await AsyncStorage.setItem("userId", profileResponse.userData._id);
            setUserData(profileResponse.userData);
          }
        } catch (profileError) {
          console.error("[Register] Error getting profile:", profileError);
        }

        Alert.alert("Success", "Registration successful!", [
          { text: "OK", onPress: () => router.replace("/(tabs)/home") },
        ]);
      } else {
        Alert.alert("Error", response.message || "Registration failed");
      }
    } catch (error) {
      console.error("[Register] Error:", error);
      Alert.alert("Registration Failed", error.message || "Please try again.");
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
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.xl,
          paddingHorizontal: spacing.lg,
          borderBottomLeftRadius: borderRadius.xl,
          borderBottomRightRadius: borderRadius.xl,
        }}
      >
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginBottom: spacing.md }}
        >
          <ArrowLeft color={colors.textWhite} size={24} />
        </TouchableOpacity>

        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: fontSize.xxl,
              fontWeight: fontWeight.bold,
              color: colors.textWhite,
              marginBottom: spacing.xs,
            }}
          >
            Create Account
          </Text>
          <Text
            style={{
              fontSize: fontSize.md,
              color: colors.textWhite,
              opacity: 0.9,
            }}
          >
            Start your wellness journey today
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
        {/* Name Input */}
        <View style={{ marginBottom: spacing.md }}>
          <Text
            style={{
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              color: colors.textDark,
              marginBottom: spacing.sm,
            }}
          >
            Full Name
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
            <User color={colors.textLight} size={20} />
            <TextInput
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.sm,
                fontSize: fontSize.md,
                color: colors.textDark,
              }}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textLight}
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </View>
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
        <View style={{ marginBottom: spacing.md }}>
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
              placeholder="Create a password"
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

        {/* Confirm Password Input */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              color: colors.textDark,
              marginBottom: spacing.sm,
            }}
          >
            Confirm Password
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
              placeholder="Confirm your password"
              placeholderTextColor={colors.textLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              {showConfirmPassword ? (
                <EyeOff color={colors.textLight} size={20} />
              ) : (
                <Eye color={colors.textLight} size={20} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            borderRadius: borderRadius.md,
            paddingVertical: spacing.md,
            alignItems: "center",
            marginBottom: spacing.lg,
            opacity: loading ? 0.7 : 1,
            ...shadow.md,
          }}
          onPress={handleRegister}
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
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={{ alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()} disabled={loading}>
            <Text style={{ color: colors.textMedium, fontSize: fontSize.sm }}>
              Already have an account?{" "}
              <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>
                Login
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
