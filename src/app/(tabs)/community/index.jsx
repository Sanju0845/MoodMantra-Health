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
    Image,
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
    BookOpen,
    Globe,
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
    const [blogPosts, setBlogPosts] = useState([]);
    const [blogLoading, setBlogLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        fetchRooms();
        fetchBlogPosts();
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);


    // Fetch blog posts from RSS feed
    const fetchBlogPosts = async () => {
        try {
            console.log('[Community] Fetching blog posts...');

            // Try fetching from blog RSS
            const response = await fetch('https://blog.raskamon.com/rss.xml', {
                method: 'GET',
                headers: { 'Accept': 'application/xml, text/xml' }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            console.log('[Community] RSS feed length:', text.length);

            // Parse RSS items
            const items = [];
            const itemRegex = /<item>([\s\S]*?)<\/item>/g;
            let match;

            while ((match = itemRegex.exec(text)) !== null && items.length < 10) {
                const itemContent = match[1];
                const title = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                    itemContent.match(/<title>(.*?)<\/title>/)?.[1] || '';
                const link = itemContent.match(/<link>(.*?)<\/link>/)?.[1] || '';
                const description = itemContent.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
                    itemContent.match(/<description>(.*?)<\/description>/)?.[1] || '';

                // Extract image from various sources
                const imageMatch = itemContent.match(/<media:content[^>]*url="([^"]+)"/i) ||
                    itemContent.match(/<enclosure[^>]*url="([^"]+)"/i) ||
                    description.match(/<img[^>]*src="([^"]+)"/i) ||
                    itemContent.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
                const image = imageMatch?.[1] || 'https://images.unsplash.com/photo-1499728603263-13726abce5fd';

                if (title) {
                    items.push({
                        id: items.length,
                        title: title.replace(/<[^>]*>/g, '').trim(),
                        link: link || 'https://blog.raskamon.com',
                        image,
                    });
                }
            }

            if (items.length > 0) {
                console.log('[Community] Loaded', items.length, 'blog posts from RSS');
                setBlogPosts(items);
            } else {
                throw new Error('No blog posts found in RSS feed');
            }
        } catch (err) {
            console.error('[Community] Blog fetch error:', err.message);
            // Always set fallback blog posts with images
            const fallbackPosts = [
                { id: 1, title: 'Mental Health Tips', link: 'https://blog.raskamon.com', image: 'https://images.unsplash.com/photo-1499728603263-13726abce5fd?w=800' },
                { id: 2, title: 'Better Sleep Guide', link: 'https://blog.raskamon.com', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800' },
                { id: 3, title: 'Mindfulness Practice', link: 'https://blog.raskamon.com', image: 'https://images.unsplash.com/photo-1506126279646-a697353d3166?w=800' },
                { id: 4, title: 'Self Care Routines', link: 'https://blog.raskamon.com', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800' },
                { id: 5, title: 'Stress Management', link: 'https://blog.raskamon.com', image: 'https://images.unsplash.com/photo-1552581234-26160f608093?w=800' },
                { id: 6, title: 'Building Resilience', link: 'https://blog.raskamon.com', image: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800' },
            ];
            console.log('[Community] Using fallback blog posts:', fallbackPosts.length);
            setBlogPosts(fallbackPosts);
        } finally {
            setBlogLoading(false);
        }
    };


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
            <StatusBar style="dark" />

            {/* Clean Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Community</Text>
                    <Text style={styles.headerSubtitle}>Connect & grow together</Text>
                </View>
            </View>

            {/* Divider Line */}
            <View style={styles.headerDivider} />

            {/* Main Content - Chat Groups Only */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 80 },
                ]}
                showsVerticalScrollIndicator={false}
                bounces={true}
                alwaysBounceVertical={true}
                overScrollMode="never"
            >
                {/* Blog Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <BookOpen size={18} color="#1F2937" strokeWidth={2} />
                        <Text style={styles.sectionTitle}>Resources</Text>
                        <TouchableOpacity
                            onPress={() => router.push('/community/blog')}
                            style={styles.seeAllButton}
                        >
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Swipable Blog Cards */}
                    {blogLoading ? (
                        <View style={styles.blogLoadingContainer}>
                            <ActivityIndicator size="small" color="#4A9B7F" />
                        </View>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.blogScrollContent}
                            decelerationRate="fast"
                            snapToInterval={SCREEN_WIDTH * 0.75 + 12}
                            snapToAlignment="start"
                        >
                            {blogPosts.map((post, index) => (
                                <TouchableOpacity
                                    key={post.id}
                                    style={styles.blogSwipeCard}
                                    onPress={() => router.push('/community/blog')}
                                    activeOpacity={0.85}
                                >
                                    <Image
                                        source={{ uri: post.image }}
                                        style={styles.blogCardImage}
                                        resizeMode="cover"
                                    />
                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                                        style={styles.blogImageOverlay}
                                    >
                                        <Text style={styles.blogSwipeTitle} numberOfLines={2}>
                                            {post.title}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Section Divider */}
                <View style={styles.sectionDivider} />

                {/* Chat Groups Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MessageCircle size={18} color="#1F2937" strokeWidth={2} />
                        <Text style={styles.sectionTitle}>Chat Groups</Text>
                    </View>

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
        backgroundColor: "#FFFFFF",
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        backgroundColor: "#FFFFFF",
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerContent: {
        paddingHorizontal: 24,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: "700",
        color: "#1F2937",
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 15,
        color: "#6B7280",
        fontWeight: "400",
    },
    headerDivider: {
        height: 1,
        backgroundColor: "#E5E7EB",
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
        marginBottom: 24,
    },
    sectionDivider: {
        height: 1,
        backgroundColor: "#E5E7EB",
        marginHorizontal: 20,
        marginVertical: 16,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
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
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    iconGradient: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
    },
    roomContent: {
        flex: 1,
    },
    roomName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    roomDescription: {
        fontSize: 13,
        color: "#6B7280",
        lineHeight: 18,
    },
    arrowContainer: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 10,
    },
    arrow: {
        fontSize: 16,
        color: "#6B7280",
        fontWeight: "600",
    },
    blogFeatureCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 18,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    blogIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: "#F0FDF4",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
    },
    blogTextContent: {
        flex: 1,
        justifyContent: "center",
    },
    blogTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    blogDescription: {
        fontSize: 13,
        color: "#6B7280",
        lineHeight: 18,
    },
    blogArrowContainer: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 10,
    },
    blogArrow: {
        fontSize: 16,
        color: "#6B7280",
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
    // Rectangular Blog Cards Styles
    seeAllButton: {
        marginLeft: 'auto',
    },
    seeAllText: {
        fontSize: 14,
        color: '#4A9B7F',
        fontWeight: '600',
    },
    blogCardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 12,
    },
    blogRectCard: {
        width: (SCREEN_WIDTH - 52) / 2,
        height: 140,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    blogRectGradient: {
        flex: 1,
        padding: 16,
        justifyContent: 'flex-end',
    },
    blogRectIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    blogRectTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    blogRectDesc: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    // Swipable Blog Card Styles
    blogLoadingContainer: {
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
    },
    blogScrollContent: {
        paddingRight: 20,
        paddingTop: 12,
        gap: 12,
    },
    blogSwipeCard: {
        width: SCREEN_WIDTH * 0.75,
        height: 180,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
        backgroundColor: '#E5E7EB',
    },
    blogCardImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    blogImageOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: 16,
    },
    blogSwipeTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        lineHeight: 24,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
});
