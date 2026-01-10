import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Globe } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function BlogIndex() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <View style={styles.container}>
                {/* Custom Header */}
                <LinearGradient
                    colors={["#F59E0B", "#D97706"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingTop: insets.top + 12 }]}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                            activeOpacity={0.7}
                        >
                            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
                        </TouchableOpacity>

                        <View style={styles.headerTitleContainer}>
                            <Globe size={24} color="#FFFFFF" strokeWidth={2.5} />
                            <View style={styles.headerTextContainer}>
                                <Text style={styles.headerTitle}>Raskamon Blog</Text>
                                <Text style={styles.headerSubtitle}>Mental wellness insights</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>

                {/* Loading Indicator */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#F59E0B" />
                        <Text style={styles.loadingText}>Loading blog...</Text>
                    </View>
                )}

                {/* Error State */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Globe size={48} color="#D1D5DB" strokeWidth={1.5} />
                        <Text style={styles.errorText}>Failed to load blog</Text>
                        <Text style={styles.errorSubtext}>
                            Please check your connection and try again
                        </Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => {
                                setError(false);
                                setLoading(true);
                            }}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* WebView */}
                <WebView
                    source={{ uri: "https://blog.raskamon.com" }}
                    style={styles.webview}
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                    onError={() => {
                        setLoading(false);
                        setError(true);
                    }}
                    startInLoadingState={false}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    mixedContentMode="compatibility"
                    allowsBackForwardNavigationGestures={true}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    header: {
        paddingBottom: 16,
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    headerContent: {
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitleContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.9)",
        marginTop: 2,
        fontWeight: "500",
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        zIndex: 10,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 15,
        color: "#6B7280",
        fontWeight: "500",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
        backgroundColor: "#F9FAFB",
    },
    errorText: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        marginTop: 24,
        marginBottom: 8,
        textAlign: "center",
    },
    errorSubtext: {
        fontSize: 15,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: "#F59E0B",
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});
