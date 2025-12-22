import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../utils/supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Brain, Users, Star, Briefcase, Sun, Apple, Moon, Baby, MessageCircle, ChevronRight, MessageSquare } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Icon mapping
const ICON_MAP = {
    'Heart': Heart,
    'Brain': Brain,
    'Users': Users,
    'Star': Star,
    'Briefcase': Briefcase,
    'Sun': Sun,
    'Apple': Apple,
    'Moon': Moon,
    'Baby': Baby,
    'MessageCircle': MessageCircle,
};

export default function CommunityHub() {
    const router = useRouter();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const { data, error } = await supabase
                .from('community_rooms')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching rooms:', error);
                // Fallback data if table doesn't exist yet or fails
                setRooms(FALLBACK_ROOMS);
            } else {
                if (data && data.length > 0) {
                    setRooms(data);
                } else {
                    setRooms(FALLBACK_ROOMS);
                }
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            setRooms(FALLBACK_ROOMS);
        } finally {
            setLoading(false);
        }
    };

    const handleRoomPress = (roomId, roomName, roomIcon) => {
        router.push({
            pathname: '/community/chat/[id]',
            params: { id: roomId, name: roomName, icon: roomIcon }
        });
    };

    const renderRoomItem = ({ item }) => {
        const IconComponent = ICON_MAP[item.icon] || MessageCircle;

        return (
            <TouchableOpacity
                style={styles.roomCard}
                activeOpacity={0.9}
                onPress={() => handleRoomPress(item.id, item.name, item.icon)}
            >
                <LinearGradient
                    colors={['#FFFFFF', '#F9FAFB']}
                    style={styles.cardGradient}
                >
                    <View style={styles.iconContainer}>
                        <LinearGradient
                            colors={['#E6F7F2', '#D1F0E6']}
                            style={styles.iconBackground}
                        >
                            <IconComponent size={24} color="#4A9B7F" strokeWidth={2.5} />
                        </LinearGradient>
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={styles.roomName}>{item.name}</Text>
                        <Text style={styles.roomDescription} numberOfLines={1}>
                            {item.description}
                        </Text>
                    </View>

                    <View style={styles.arrowContainer}>
                        <ChevronRight size={20} color="#9CA3AF" />
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A9B7F" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Community Hub</Text>
                <Text style={styles.headerSubtitle}>
                    Connect, share, and grow together in our safe spaces.
                </Text>
            </View>

            <FlatList
                data={rooms}
                renderItem={renderRoomItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={<View style={{ height: 80 }} />} // Spacing for bottom tab bar
            />
        </SafeAreaView>
    );
}

// Fallback data in case DB is empty or not connected yet
const FALLBACK_ROOMS = [
    { id: '1', name: 'Wellbeing Warriors', description: 'General mental health and wellbeing support.', icon: 'Heart', category: 'Wellbeing' },
    { id: '2', name: 'Mental Support', description: 'A safe space to discuss mental health challenges.', icon: 'Brain', category: 'Support' },
    { id: '3', name: 'Relationship Advice', description: 'Discussing healthy relationships and advice.', icon: 'Users', category: 'Relationships' },
    { id: '4', name: 'User Experiences', description: 'Share your journey and experiences with others.', icon: 'Star', category: 'Community' },
    { id: '5', name: 'Career Stress', description: 'Support for work-related stress and burnout.', icon: 'Briefcase', category: 'Career' },
    { id: '6', name: 'Mindfulness Place', description: 'Tips and discussions on mindfulness and meditation.', icon: 'Sun', category: 'Mindfulness' },
    { id: '7', name: 'Health & Nutrition', description: 'Discussing physical health, diet, and nutrition.', icon: 'Apple', category: 'Health' },
    { id: '8', name: 'Sleep Hygiene', description: 'Tips for better sleep and overcoming insomnia.', icon: 'Moon', category: 'Health' },
    { id: '9', name: 'Parenting Support', description: 'Support and advice for parents.', icon: 'Baby', category: 'Family' },
    { id: '10', name: 'General Chat', description: 'Off-topic discussions and hanging out.', icon: 'MessageCircle', category: 'General' },
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    listContent: {
        padding: 16,
    },
    roomCard: {
        marginBottom: 16,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    cardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    iconContainer: {
        marginRight: 16,
    },
    iconBackground: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    roomName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    roomDescription: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
        marginRight: 6,
    },
    activeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#059669',
    },
    arrowContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
