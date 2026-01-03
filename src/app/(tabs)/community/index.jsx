import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Animated,
    Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
    Heart,
    Brain,
    Users,
    Briefcase,
    Sun,
    Apple,
    Moon,
    Baby,
    MessageCircle,
    Sparkles,
    TrendingUp,
    Shield,
} from "lucide-react-native";
import { supabase } from "../../../utils/supabaseClient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Icon mapping with colors
const ICON_CONFIG = {
    Heart: { component: Heart, color: "#E04C7A", gradient: ["#E04C7A", "#C93866"] },
    Brain: { component: Brain, color: "#665AE1", gradient: ["#665AE1", "#5244C7"] },
    Users: { component: Users, color: "#B3418B", gradient: ["#B3418B", "#993771"] },
    Briefcase: { component: Briefcase, color: "#565A70", gradient: ["#565A70", "#3F4356"] },
    Sun: { component: Sun, color: "#F59E0B", gradient: ["#F59E0B", "#D97706"] },
    Apple: { component: Apple, color: "#7E8452", gradient: ["#7E8452", "#6A7043"] },
    Moon: { component: Moon, color: "#6366F1", gradient: ["#6366F1", "#4F46E5"] },
    Baby: { component: Baby, color: "#EC4899", gradient: ["#EC4899", "#DB2777"] },
    MessageCircle: { component: MessageCircle, color: "#8B5CF6", gradient: ["#8B5CF6", "#7C3AED"] },
};

// Fallback community rooms
const FALLBACK_ROOMS = [
    { id: "wellbeing-warriors", name: "Wellbeing Warriors", description: "General mental health and wellbeing support", icon: "Heart" },
    { id: "mental-support", name: "Mental Support", description: "A safe space to discuss mental health challenges", icon: "Brain" },
    { id: "relationship-advice", name: "Relationship Advice", description: "Discussing healthy relationships and advice", icon: "Users" },
    { id: "career-stress", name: "Career Stress", description: "Support for work-related stress and burnout", icon: "Briefcase" },
    { id: "mindfulness-place", name: "Mindfulness Place", description: "Tips and discussions on mindfulness and meditation", icon: "Sun" },
    { id: "health-nutrition", name: "Health & Nutrition", description: "Discussing physical health, diet, and nutrition", icon: "Apple" },
    { id: "sleep-hygiene", name: "Sleep Hygiene", description: "Tips for better sleep and overcoming insomnia", icon: "Moon" },
    { id: "parenting-support", name: "Parenting Support", description: "Support and advice for parents", icon: "Baby" },
    { id: "general-chat", name: "General Chat", description: "Off-topic discussions and hanging out", icon: "MessageCircle" },
];

// Modern RoomCard Component
function ModernRoomCard({ room, onPress }) {
    const iconConfig = ICON_CONFIG[room.icon] || ICON_CONFIG.MessageCircle;
    const IconComponent = iconConfig.component;
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
                style={styles.roomCard}
            >
                <LinearGradient
                    colors={iconConfig.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradient}
                >
                    <IconComponent size={24} color="#FFFFFF" strokeWidth={2.5} />
                </LinearGradient>

                <View style={styles.roomContent}>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <Text style={styles.roomDescription} numberOfLines={2}>
                        {room.description}
                    </Text>
                </View>

                <View style={styles.arrowContainer}>
                    <Text style={styles.arrow}>→</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}



export default function CommunityHub() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const navigation = useNavigation();
    const [rooms, setRooms] = useState(FALLBACK_ROOMS);
    const [loading, setLoading] = useState(true);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        fetchRooms();
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
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
                setRooms(FALLBACK_ROOMS);
            } else if (data && data.length > 0) {
                console.log('[Community] Loaded', data.length, 'rooms from Supabase');
                // Filter only enabled rooms (is_enabled !== false)
                const enabledRooms = data.filter(room => room.is_enabled !== false);
                console.log('[Community] Showing', enabledRooms.length, 'enabled rooms');
                setRooms(enabledRooms);
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


    const handleRoomPress = async (room) => {
        await Haptics.selectionAsync();
        router.push({
            pathname: "/community/chat/[id]",
            params: { id: room.id, name: room.name, icon: room.icon },
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Pink Gradient Header - Reduced Size */}
            <LinearGradient
                colors={["#EC4899", "#DB2777", "#BE185D"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 12 }]}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <View style={styles.sparkleContainer}>
                            <Sparkles size={24} color="#FCD34D" strokeWidth={2} />
                        </View>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Community</Text>
                            <Text style={styles.headerSubtitle}>Connect & grow together</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Main Content - Chat Groups Only */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 80 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Chat Groups Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MessageCircle size={20} color="#8B5CF6" strokeWidth={2.5} />
                        <Text style={styles.sectionTitle}>Chat Groups</Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>
                        Join conversations and connect with others
                    </Text>

                    {rooms.map((room, index) => (
                        <ModernRoomCard
                            key={room.id}
                            room={room}
                            onPress={() => handleRoomPress(room)}
                        />
                    ))}
                </View>

                {/* Bottom Spacing */}
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
        paddingBottom: 16,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    headerContent: {
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    sparkleContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.9)",
        marginTop: 3,
        fontWeight: "500",
    },
    statsBar: {
        flexDirection: "row",
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        marginHorizontal: 24,
        borderRadius: 16,
        padding: 16,
        justifyContent: "space-around",
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statDivider: {
        width: 1,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        marginHorizontal: 8,
    },
    statValue: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
        marginTop: 6,
    },
    statLabel: {
        fontSize: 11,
        color: "rgba(255, 255, 255, 0.8)",
        marginTop: 2,
        fontWeight: "500",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1F2937",
    },
    sectionSubtitle: {
        fontSize: 15,
        color: "#6B7280",
        marginBottom: 24,
        lineHeight: 22,
    },
    roomCard: {
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
    iconGradient: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    roomContent: {
        flex: 1,
    },
    roomName: {
        fontSize: 17,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 4,
    },
    roomDescription: {
        fontSize: 14,
        color: "#6B7280",
        lineHeight: 20,
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
    arrow: {
        fontSize: 18,
        color: "#8B5CF6",
        fontWeight: "600",
    },
    // Blog Carousel Styles
    blogCarousel: {
        marginTop: 16,
    },
    blogCarouselContent: {
        paddingRight: 20,
    },
    blogCard: {
        width: SCREEN_WIDTH * 0.75,
        height: 200,
        marginBottom: 8,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        backgroundColor: "#FFFFFF",
    },
    blogCardImage: {
        width: "100%",
        height: "100%",
        position: "absolute",
    },
    blogCardOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        padding: 16,
        justifyContent: "flex-end",
    },
    blogCardContent: {
        gap: 6,
    },
    blogCardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
        lineHeight: 22,
    },
    blogCardExcerpt: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.9)",
        lineHeight: 18,
    },
    blogCardCategoryContainer: {
        alignSelf: "flex-start",
        backgroundColor: "rgba(138, 92, 246, 0.9)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 4,
    },
    blogCardCategory: {
        fontSize: 10,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});
