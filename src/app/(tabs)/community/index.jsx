import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    useColorScheme,
    ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import {
    Heart,
    Brain,
    Users,
    Star,
    Briefcase,
    Sun,
    Apple,
    Moon,
    Baby,
    MessageCircle,
} from "lucide-react-native";
import {
    useFonts,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
} from "@expo-google-fonts/inter";
import { supabase } from "../../../utils/supabaseClient";

// Theme configuration
const themes = {
    light: {
        background: "#FFFFFF",
        headerBackground: "#FFFFFF",
        text: "#1A1A1A",
        textSecondary: "#8E8E93",
        cardBackground: "#FFFFFF",
        cardBorder: "#E6E6E6",
        headerBorder: "#E5E5E5",
        statusBarStyle: "dark",
    },
    dark: {
        background: "#121212",
        headerBackground: "#121212",
        text: "#FFFFFF",
        textSecondary: "#A0A0A0",
        cardBackground: "#1E1E1E",
        cardBorder: "#2A2A2A",
        headerBorder: "#2A2A2A",
        statusBarStyle: "light",
    },
};

// Icon mapping with colors
const ICON_CONFIG = {
    Heart: { component: Heart, color: "#E04C7A" },
    Brain: { component: Brain, color: "#665AE1" },
    Users: { component: Users, color: "#B3418B" },
    Star: { component: Star, color: "#F59E0B" },
    Briefcase: { component: Briefcase, color: "#565A70" },
    Sun: { component: Sun, color: "#F97316" },
    Apple: { component: Apple, color: "#7E8452" },
    Moon: { component: Moon, color: "#6366F1" },
    Baby: { component: Baby, color: "#EC4899" },
    MessageCircle: { component: MessageCircle, color: "#8B5CF6" },
};

// Fallback community rooms (if Supabase fails)
const FALLBACK_ROOMS = [
    {
        id: "wellbeing-warriors",
        name: "Wellbeing Warriors",
        description: "General mental health and wellbeing support",
        icon: "Heart",
    },
    {
        id: "mental-support",
        name: "Mental Support",
        description: "A safe space to discuss mental health challenges",
        icon: "Brain",
    },
    {
        id: "relationship-advice",
        name: "Relationship Advice",
        description: "Discussing healthy relationships and advice",
        icon: "Users",
    },
    {
        id: "user-experiences",
        name: "User Experiences",
        description: "Share your journey and experiences with others",
        icon: "Star",
    },
    {
        id: "career-stress",
        name: "Career Stress",
        description: "Support for work-related stress and burnout",
        icon: "Briefcase",
    },
    {
        id: "mindfulness-place",
        name: "Mindfulness Place",
        description: "Tips and discussions on mindfulness and meditation",
        icon: "Sun",
    },
    {
        id: "health-nutrition",
        name: "Health & Nutrition",
        description: "Discussing physical health, diet, and nutrition",
        icon: "Apple",
    },
    {
        id: "sleep-hygiene",
        name: "Sleep Hygiene",
        description: "Tips for better sleep and overcoming insomnia",
        icon: "Moon",
    },
    {
        id: "parenting-support",
        name: "Parenting Support",
        description: "Support and advice for parents",
        icon: "Baby",
    },
    {
        id: "general-chat",
        name: "General Chat",
        description: "Off-topic discussions and hanging out",
        icon: "MessageCircle",
    },
];

// RoomCard Component
function RoomCard({ room, onPress, theme }) {
    const iconConfig = ICON_CONFIG[room.icon] || ICON_CONFIG.MessageCircle;
    const IconComponent = iconConfig.component;
    const iconColor = iconConfig.color;

    return (
        <TouchableOpacity
            style={[
                styles.roomCard,
                {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.cardBorder,
                },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityLabel={`Open ${room.name} room`}
        >
            <View style={styles.iconContainer}>
                <IconComponent size={24} color={iconColor} strokeWidth={2} />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.roomName, { color: theme.text }]}>
                    {room.name}
                </Text>
                <Text
                    style={[styles.roomDescription, { color: theme.textSecondary }]}
                    numberOfLines={1}
                >
                    {room.description}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

export default function CommunityHub() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = themes[colorScheme] || themes.light;
    const [showHeaderBorder, setShowHeaderBorder] = useState(false);
    const [rooms, setRooms] = useState(FALLBACK_ROOMS);
    const [loading, setLoading] = useState(true);

    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    // Fetch rooms from Supabase
    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            console.log('[Community] Fetching rooms from Supabase...');
            const { data, error } = await supabase
                .from('community_rooms')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('[Community] Error fetching rooms:', error);
                // Use fallback rooms
                setRooms(FALLBACK_ROOMS);
            } else if (data && data.length > 0) {
                console.log('[Community] Loaded', data.length, 'rooms from Supabase');
                setRooms(data);
            } else {
                console.log('[Community] No rooms in database, using fallback');
                setRooms(FALLBACK_ROOMS);
            }
        } catch (err) {
            console.error('[Community] Fetch error:', err);
            setRooms(FALLBACK_ROOMS);
        } finally {
            setLoading(false);
        }
    };

    if (!fontsLoaded || loading) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
        );
    }

    const handleRoomPress = async (room) => {
        await Haptics.selectionAsync();
        // Navigate to chat room
        router.push({
            pathname: "/community/chat/[id]",
            params: { id: room.id, name: room.name, icon: room.icon },
        });
    };

    const handleScroll = (event) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        setShowHeaderBorder(offsetY > 0);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar style={theme.statusBarStyle} />

            {/* Header */}
            <View
                style={[
                    styles.headerContainer,
                    {
                        paddingTop: insets.top + 12,
                        backgroundColor: theme.headerBackground,
                    },
                    showHeaderBorder && [
                        styles.headerWithBorder,
                        { borderBottomColor: theme.headerBorder },
                    ],
                ]}
            >
                <Text style={[styles.title, { color: theme.text }]}>Community Hub</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Connect, share, and grow together in our safe spaces
                </Text>
            </View>

            {/* Room List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 20 },
                ]}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                {rooms.map((room) => (
                    <RoomCard
                        key={room.id}
                        room={room}
                        onPress={() => handleRoomPress(room)}
                        theme={theme}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 1000,
    },
    headerWithBorder: {
        borderBottomWidth: 1,
    },
    title: {
        fontFamily: "Inter_700Bold",
        fontSize: 28,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: "Inter_400Regular",
        fontSize: 15,
        lineHeight: 22,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
        gap: 12,
    },
    roomCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#F9FAFB",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    roomName: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 16,
        marginBottom: 4,
    },
    roomDescription: {
        fontFamily: "Inter_400Regular",
        fontSize: 14,
        lineHeight: 20,
    },
});



