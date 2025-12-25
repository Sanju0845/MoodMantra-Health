import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Platform,
    Alert,
    useColorScheme,
    ActivityIndicator,
    KeyboardAvoidingView,
    FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Send } from "lucide-react-native";
import { supabase } from "../../../../utils/supabaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../../utils/api";

export default function ChatRoom() {
    const { id, name } = useLocalSearchParams();
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const backgroundColor = isDark ? "#121212" : "#FFFFFF";
    const primaryColor = isDark ? "#FFFFFF" : "#1F2937";
    const secondaryColor = isDark ? "#9CA3AF" : "#6B7280";
    const blueColor = "#3B82F6";
    const bubbleBg = isDark ? "#2A2A2A" : "#E5E7EB";

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const flatListRef = useRef(null);

    // Hide tab bar
    useLayoutEffect(() => {
        const parent = navigation.getParent();
        parent?.setOptions({ tabBarStyle: { display: "none" } });
        return () => parent?.setOptions({ tabBarStyle: undefined });
    }, [navigation]);

    useEffect(() => {
        loadUserAndMessages();

        // Subscribe to real-time messages
        const channel = supabase
            .channel(`room-${id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "community_messages",
                    filter: `room_id=eq.${id}`,
                },
                (payload) => {
                    setMessages((current) => {
                        const exists = current.find((m) => m.id === payload.new.id);
                        if (exists) return current;
                        return [payload.new, ...current]; // Prepend for inverted list
                    });
                    setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [id]);

    const loadUserAndMessages = async () => {
        try {
            console.log('[Chat] Loading user and messages for room:', id);

            // Get current user
            const profileResponse = await api.getProfile();
            if (profileResponse.success && profileResponse.userData) {
                const userData = profileResponse.userData;
                console.log('[Chat] User loaded:', userData._id);
                setCurrentUser({
                    id: userData._id,
                    name: userData.name || "User",
                    avatar: userData.image || null,
                });
            } else {
                const userId = await AsyncStorage.getItem("userId");
                const userName = await AsyncStorage.getItem("userName") || "User";
                console.log('[Chat] User from storage:', userId);
                setCurrentUser({ id: userId, name: userName, avatar: null });
            }

            // Fetch messages
            console.log('[Chat] Fetching messages for room_id:', id);
            const { data, error } = await supabase
                .from("community_messages")
                .select("*")
                .eq("room_id", id)
                .order("created_at", { ascending: false }); // Descending for inverted list

            if (error) {
                console.error('[Chat] Error fetching messages:', error);
                Alert.alert("Error", "Failed to load messages: " + error.message);
            } else {
                console.log('[Chat] Messages loaded:', data?.length || 0);
                setMessages(data || []);
                setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: false }), 100);
            }
        } catch (err) {
            console.error("[Chat] Error:", err);
            Alert.alert("Error", "Failed to load chat: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim() || sending || !currentUser?.id) {
            console.log('[Chat] Cannot send - inputText:', inputText.trim(), 'sending:', sending, 'userId:', currentUser?.id);
            return;
        }

        const messageText = inputText.trim();
        setInputText("");
        setSending(true);

        console.log('[Chat] Sending message:', messageText, 'to room:', id, 'from user:', currentUser.id);

        try {
            const { data, error } = await supabase
                .from("community_messages")
                .insert({
                    room_id: id,
                    user_id: currentUser.id,
                    user_name: currentUser.name,
                    user_avatar: currentUser.avatar,
                    content: messageText,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) {
                console.error('[Chat] Error sending message:', error);
                Alert.alert("Error", "Failed to send message: " + error.message);
                setInputText(messageText);
            } else {
                console.log('[Chat] Message sent successfully:', data);
                setMessages((current) => [data, ...current]); // Prepend for inverted list
                setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
            }
        } catch (error) {
            console.error("[Chat] Error sending message:", error);
            Alert.alert("Error", "Failed to send message. Please try again.");
            setInputText(messageText);
        } finally {
            setSending(false);
        }
    };

    // Debug: Log when messages change
    useEffect(() => {
        console.log('[Chat] Messages state updated. Count:', messages.length);
        if (messages.length > 0) {
            console.log('[Chat] Last message:', messages[messages.length - 1]);
        }
    }, [messages]);

    const renderMessage = ({ item }) => {
        const isMe = item.user_id === currentUser?.id;
        console.log('[Chat] Rendering message:', item.id, 'isMe:', isMe, 'content:', item.content);

        return (
            <View
                style={{
                    marginBottom: 12,
                    alignSelf: isMe ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                }}
            >
                {!isMe && (
                    <Text
                        style={{
                            fontSize: 12,
                            color: secondaryColor,
                            marginBottom: 4,
                            marginLeft: 4,
                        }}
                    >
                        {item.user_name}
                    </Text>
                )}
                <View
                    style={{
                        backgroundColor: isMe ? blueColor : bubbleBg,
                        borderRadius: 16,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                    }}
                >
                    {/* Message Content */}
                    <Text
                        style={{
                            color: isMe ? "#FFFFFF" : (isDark ? "#FFFFFF" : "#111827"),
                            fontSize: 16,
                            lineHeight: 22,
                            marginBottom: 4,
                        }}
                    >
                        {item.content || "[No content]"}
                    </Text>

                    {/* Timestamp */}
                    <Text
                        style={{
                            color: isMe ? "rgba(255,255,255,0.8)" : (isDark ? "#9CA3AF" : "#6B7280"),
                            fontSize: 11,
                            alignSelf: "flex-end",
                        }}
                    >
                        {new Date(item.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={blueColor} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* Header */}
            <View
                style={{
                    paddingTop: insets.top + 12,
                    paddingHorizontal: 16,
                    paddingBottom: 12,
                    backgroundColor,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? "#2A2A2A" : "#E5E7EB",
                    flexDirection: "row",
                    alignItems: "center",
                }}
            >
                <TouchableOpacity
                    style={{ marginRight: 12, padding: 4 }}
                    onPress={() => router.back()}
                >
                    <ChevronLeft size={24} color={primaryColor} />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: "600", color: primaryColor }}>
                        {name || "Chat Room"}
                    </Text>
                    <Text style={{ fontSize: 13, color: secondaryColor }}>
                        Community Chat
                    </Text>
                </View>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                inverted
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 16,
                    paddingBottom: 20,
                }}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: false })}
                ListEmptyComponent={
                    <View style={{ paddingVertical: 60, alignItems: "center" }}>
                        <Text style={{ fontSize: 16, color: secondaryColor }}>
                            No messages yet
                        </Text>
                        <Text style={{ fontSize: 14, color: secondaryColor, marginTop: 8 }}>
                            Start the conversation!
                        </Text>
                    </View>
                }
            />

            {/* Input */}
            <View
                style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    paddingBottom: insets.bottom + 4,
                    backgroundColor,
                    borderTopWidth: 1,
                    borderTopColor: isDark ? "#2A2A2A" : "#E5E7EB",
                    flexDirection: "row",
                    alignItems: "center",
                }}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: isDark ? "#1E1E1E" : "#F3F4F6",
                        borderRadius: 24,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        marginRight: 12,
                    }}
                >
                    <TextInput
                        style={{
                            fontSize: 15,
                            color: primaryColor,
                            maxHeight: 100,
                        }}
                        placeholder="Type a message..."
                        placeholderTextColor={secondaryColor}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        editable={!sending}
                    />
                </View>

                <TouchableOpacity
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: blueColor,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: !inputText.trim() || sending ? 0.5 : 1,
                    }}
                    onPress={sendMessage}
                    disabled={!inputText.trim() || sending}
                >
                    <Send size={20} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
