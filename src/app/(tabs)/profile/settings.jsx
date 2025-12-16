import { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Switch,
    Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Moon, Sun, Palette } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        loadThemePreference();
    }, []);

    const loadThemePreference = async () => {
        try {
            const theme = await AsyncStorage.getItem("appTheme");
            setIsDarkMode(theme === "dark");
        } catch (error) {
            console.error("Error loading theme:", error);
        }
    };

    const toggleTheme = async () => {
        try {
            const newTheme = !isDarkMode ? "dark" : "light";
            await AsyncStorage.setItem("appTheme", newTheme);
            setIsDarkMode(!isDarkMode);
            // Alert removed for smoother experience
            // Alert.alert("Theme Updated", ...);
        } catch (error) {
            console.error("Error saving theme:", error);
        }
    };

    return (
        <View style={[
            styles.container,
            { paddingTop: insets.top },
            isDarkMode && { backgroundColor: "#111827" }
        ]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            {/* Header */}
            <View style={[styles.header, isDarkMode && { backgroundColor: "#1F2937", borderBottomColor: "#374151" }]}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, isDarkMode && { backgroundColor: "#374151" }]}>
                    <ArrowLeft size={22} color={isDarkMode ? "#F3F4F6" : "#1F2937"} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isDarkMode && { color: "#F3F4F6" }]}>Settings</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Appearance Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && { color: "#9CA3AF" }]}>Appearance</Text>

                    <View style={[styles.settingCard, isDarkMode && { backgroundColor: "#1F2937", borderColor: "#374151" }]}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <View style={[styles.settingIcon, { backgroundColor: isDarkMode ? "#374151" : "#E0E7FF" }]}>
                                    <Palette size={20} color={isDarkMode ? "#818CF8" : "#6366F1"} />
                                </View>
                                <View>
                                    <Text style={[styles.settingTitle, isDarkMode && { color: "#F3F4F6" }]}>Theme</Text>
                                    <Text style={[styles.settingSubtitle, isDarkMode && { color: "#9CA3AF" }]}>
                                        {isDarkMode ? "Dark mode" : "Light mode"}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.themeToggle}>
                                <Sun size={18} color={isDarkMode ? "#4B5563" : "#F59E0B"} />
                                <Switch
                                    value={isDarkMode}
                                    onValueChange={toggleTheme}
                                    trackColor={{ false: "#E5E7EB", true: "#4A9B7F" }}
                                    thumbColor={isDarkMode ? "#FFFFFF" : "#FFFFFF"}
                                    ios_backgroundColor="#E5E7EB"
                                    style={{ marginHorizontal: 8 }}
                                />
                                <Moon size={18} color={isDarkMode ? "#6366F1" : "#9CA3AF"} />
                            </View>
                        </View>
                    </View>

                    {/* Theme Preview */}
                    <View style={styles.themePreview}>
                        <Text style={styles.previewLabel}>Preview</Text>
                        <View style={[
                            styles.previewCard,
                            isDarkMode && styles.previewCardDark
                        ]}>
                            <View style={[
                                styles.previewHeader,
                                isDarkMode && styles.previewHeaderDark
                            ]} />
                            <View style={styles.previewContent}>
                                <View style={[
                                    styles.previewLine,
                                    isDarkMode && styles.previewLineDark
                                ]} />
                                <View style={[
                                    styles.previewLineShort,
                                    isDarkMode && styles.previewLineDark
                                ]} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* App Info */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && { color: "#9CA3AF" }]}>About</Text>
                    <View style={[styles.infoCard, isDarkMode && { backgroundColor: "#1F2937", borderColor: "#374151" }]}>
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, isDarkMode && { color: "#D1D5DB" }]}>App Version</Text>
                            <Text style={[styles.infoValue, isDarkMode && { color: "#F3F4F6" }]}>1.0.0</Text>
                        </View>
                        <View style={[styles.divider, isDarkMode && { backgroundColor: "#374151" }]} />
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, isDarkMode && { color: "#D1D5DB" }]}>Build</Text>
                            <Text style={[styles.infoValue, isDarkMode && { color: "#F3F4F6" }]}>2024.12.11</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.footerNote}>
                    Theme changes will take full effect on next app restart
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
    },
    headerSpacer: {
        width: 40,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    section: {
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    settingCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    settingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    settingLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    settingIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    settingSubtitle: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2,
    },
    themeToggle: {
        flexDirection: "row",
        alignItems: "center",
    },
    themePreview: {
        marginTop: 16,
    },
    previewLabel: {
        fontSize: 12,
        color: "#9CA3AF",
        marginBottom: 8,
    },
    previewCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    previewCardDark: {
        backgroundColor: "#1F2937",
        borderColor: "#374151",
    },
    previewHeader: {
        height: 24,
        backgroundColor: "#4A9B7F",
        borderRadius: 6,
        marginBottom: 10,
    },
    previewHeaderDark: {
        backgroundColor: "#3B8068",
    },
    previewContent: {
        gap: 6,
    },
    previewLine: {
        height: 8,
        backgroundColor: "#E5E7EB",
        borderRadius: 4,
    },
    previewLineShort: {
        height: 8,
        backgroundColor: "#E5E7EB",
        borderRadius: 4,
        width: "60%",
    },
    previewLineDark: {
        backgroundColor: "#374151",
    },
    infoCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
    },
    infoLabel: {
        fontSize: 15,
        color: "#4B5563",
    },
    infoValue: {
        fontSize: 15,
        color: "#1F2937",
        fontWeight: "500",
    },
    divider: {
        height: 1,
        backgroundColor: "#F3F4F6",
        marginVertical: 4,
    },
    footerNote: {
        fontSize: 12,
        color: "#9CA3AF",
        textAlign: "center",
        marginTop: 8,
    },
});
