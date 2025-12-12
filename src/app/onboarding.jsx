import { useState, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Dimensions,
    Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Check } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

const ONBOARDING_DATA = [
    {
        id: "1",
        title: "Your health\nmade simple",
        quote: "Take the first step towards wellness",
        showLogo: true,
    },
    {
        id: "2",
        title: "Tailored care\nfor your unique\nneeds.",
        quote: "Personalized insights just for you",
        showLogo: false,
    },
    {
        id: "3",
        title: "Your health\nmade simple\ntoday",
        quote: "Connect with expert therapists anytime",
        showLogo: false,
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef(null);

    const completeOnboarding = async () => {
        await AsyncStorage.setItem("hasSeenOnboarding", "true");
        router.replace("/auth/login");
    };

    const handleNext = () => {
        if (currentIndex < ONBOARDING_DATA.length - 1) {
            const nextIndex = currentIndex + 1;
            flatListRef.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
            setCurrentIndex(nextIndex);
        } else {
            completeOnboarding();
        }
    };

    const handleSkip = () => {
        completeOnboarding();
    };

    const renderSlide = ({ item, index }) => {
        return (
            <View style={styles.slide}>
                {/* Top Logo - small in corner */}
                <View style={[styles.topLogo, { marginTop: insets.top + 16 }]}>
                    <Image
                        source={require("../../assets/images/splash-icon.png")}
                        style={styles.headerLogo}
                        resizeMode="contain"
                    />
                </View>

                {/* Center Logo (only for first slide) */}
                {item.showLogo && (
                    <View style={styles.centerLogoContainer}>
                        <Image
                            source={require("../../assets/images/splash-icon.png")}
                            style={styles.centerLogo}
                            resizeMode="contain"
                        />
                    </View>
                )}

                {/* Title and Quote at bottom left */}
                <View style={[styles.textContainer, { bottom: 180 + insets.bottom }]}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.quote}>{item.quote}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Skip Button */}
            <TouchableOpacity
                style={[styles.skipButton, { top: insets.top + 16 }]}
                onPress={handleSkip}
            >
                <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            {/* Slides */}
            <Animated.FlatList
                ref={flatListRef}
                data={ONBOARDING_DATA}
                renderItem={renderSlide}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
            />

            {/* Bottom Navigation */}
            <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 32 }]}>
                {/* Progress bar */}
                <View style={styles.progressBar}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            {
                                width: scrollX.interpolate({
                                    inputRange: [0, (ONBOARDING_DATA.length - 1) * width],
                                    outputRange: ["33%", "100%"],
                                    extrapolate: "clamp",
                                }),
                            },
                        ]}
                    />
                </View>

                {/* Next Button */}
                <TouchableOpacity
                    style={styles.nextButton}
                    onPress={handleNext}
                    activeOpacity={0.8}
                >
                    {currentIndex === ONBOARDING_DATA.length - 1 ? (
                        <Check size={28} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                        <View style={styles.chevronContainer}>
                            <ChevronRight size={24} color="#FFFFFF" strokeWidth={3} />
                            <ChevronRight size={24} color="#FFFFFF" strokeWidth={3} style={{ marginLeft: -14 }} />
                            <ChevronRight size={24} color="#FFFFFF" strokeWidth={3} style={{ marginLeft: -14 }} />
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#E8F5F0", // Soft mint/beige - soothing
    },
    slide: {
        width,
        height,
        backgroundColor: "#E8F5F0", // Soft mint/beige
    },
    topLogo: {
        position: "absolute",
        left: 28,
        zIndex: 10,
    },
    headerLogo: {
        width: 40,
        height: 40,
    },
    skipButton: {
        position: "absolute",
        right: 28,
        zIndex: 100,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    skipText: {
        color: "#4A9B7F",
        fontSize: 16,
        fontWeight: "600",
    },
    centerLogoContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 150,
        justifyContent: "center",
        alignItems: "center",
    },
    centerLogo: {
        width: 180,
        height: 180,
    },
    textContainer: {
        position: "absolute",
        left: 28,
        right: 80,
    },
    title: {
        fontSize: 48,
        fontWeight: "800",
        color: "#1F2937",
        lineHeight: 56,
        letterSpacing: -1,
        marginBottom: 16,
    },
    quote: {
        fontSize: 16,
        fontWeight: "500",
        color: "#6B7280",
        lineHeight: 24,
    },
    bottomNav: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 28,
        paddingTop: 20,
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: "rgba(74, 155, 127, 0.2)",
        borderRadius: 2,
        marginRight: 24,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#4A9B7F",
        borderRadius: 2,
    },
    nextButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#1F2937",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#1F2937",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    chevronContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
});
