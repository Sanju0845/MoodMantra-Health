import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Platform,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    FlatList,
    Image,
    StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Send, ImageIcon, X } from "lucide-react-native";
import { supabase } from "../../../../utils/supabaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../../utils/api";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

export default function ChatRoom() {
    const { id, name } = useLocalSearchParams();
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const flatListRef = useRef(null);

    // Properly hide and restore tab bar
    useLayoutEffect(() => {
        const parentNav = navigation.getParent();
        if (parentNav) {
            parentNav.setOptions({
                tabBarStyle: { display: 'none' }
            });
        }

        return () => {
            if (parentNav) {
                parentNav.setOptions({
                    tabBarStyle: {
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: "#FFFFFF",
                        borderTopWidth: 0,
                        height: 60 + insets.bottom,
                        paddingBottom: insets.bottom + 8,
                        paddingTop: 6,
                        paddingHorizontal: 10,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 20,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                    }
                });
            }
        };
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
                        return [payload.new, ...current];
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
                .order("created_at", { ascending: false });

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

    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Permission Required", "Please allow photo library access");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (imageUri) => {
        try {
            if (!imageUri) return null;

            console.log('[Chat] 🖼️ Starting image upload:', imageUri.substring(0, 50) + '...');

            const base64 = await FileSystem.readAsStringAsync(imageUri, {
                encoding: 'base64',
            });

            const fileExt = imageUri.split('.').pop();
            const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
            const contentType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : 'image/png';

            console.log('[Chat] 📤 Uploading to:', fileName);

            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);

            const { data, error } = await supabase.storage
                .from('chat-images')
                .upload(fileName, byteArray, {
                    contentType: contentType,
                    upsert: false
                });

            if (error) {
                console.error('[Chat] ❌ Upload ERROR:', error);
                throw new Error(`Upload failed: ${error.message}`);
            }

            const { data: { publicUrl } } = supabase.storage
                .from('chat-images')
                .getPublicUrl(data.path);

            console.log('[Chat] ✅ Upload SUCCESS! Public URL:', publicUrl);
            return publicUrl;
        } catch (error) {
            console.error("[Chat] ❌ Upload error:", error);
            throw error;
        }
    };

    const sendMessage = async () => {
        if ((!inputText.trim() && !selectedImage) || sending || !currentUser?.id) {
            console.log('[Chat] Cannot send');
            return;
        }

        const messageText = inputText.trim();
        const imageToSend = selectedImage;
        setInputText("");
        setSelectedImage(null);
        setSending(true);

        console.log('[Chat] Sending message:', messageText, 'image:', !!imageToSend);

        try {
            let imageUrl = null;
            if (imageToSend) {
                imageUrl = await uploadImage(imageToSend);
            }

            const { data, error } = await supabase
                .from("community_messages")
                .insert({
                    room_id: id,
                    user_id: currentUser.id,
                    user_name: currentUser.name,
                    user_avatar: currentUser.avatar,
                    content: messageText || '',
                    file_url: imageUrl,
                    file_type: imageUrl ? 'image' : null,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) {
                console.error('[Chat] Error sending message:', error);
                Alert.alert("Error", error.message || "Failed to send message");
                setInputText(messageText);
                setSelectedImage(imageToSend);
            } else {
                console.log('[Chat] Message sent successfully:', data);
                setMessages((current) => [data, ...current]);
                setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
            }
        } catch (error) {
            console.error("[Chat] Error sending message:", error);
            Alert.alert("Error", error.message || "Failed to send message");
            setInputText(messageText);
            setSelectedImage(imageToSend);
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }) => {
        const isMe = item.user_id === currentUser?.id;

        return (
            <View
                style={[
                    styles.messageContainer,
                    isMe ? styles.myMessageContainer : styles.otherMessageContainer,
                ]}
            >
                {!isMe && (
                    <Text style={styles.senderName}>{item.user_name}</Text>
                )}
                <View
                    style={[
                        styles.messageBubble,
                        isMe ? styles.myMessageBubble : styles.otherMessageBubble,
                    ]}
                >
                    {/* Image */}
                    {item.file_url && item.file_type === 'image' && (
                        <View style={{ marginBottom: item.content ? 8 : 0 }}>
                            <Image
                                source={{ uri: item.file_url }}
                                style={styles.messageImage}
                                resizeMode="cover"
                                onError={(e) => {
                                    console.log('[Chat] ❌ Image load FAILED:', item.file_url);
                                }}
                                onLoad={() => {
                                    console.log('[Chat] ✅ Image loaded successfully:', item.file_url);
                                }}
                            />
                        </View>
                    )}

                    {/* Message Content */}
                    {item.content ? (
                        <Text
                            style={[
                                styles.messageText,
                                isMe ? styles.myMessageText : styles.otherMessageText,
                            ]}
                        >
                            {item.content}
                        </Text>
                    ) : null}

                    {/* Timestamp */}
                    <Text
                        style={[
                            styles.timestamp,
                            isMe ? styles.myTimestamp : styles.otherTimestamp,
                        ]}
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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
            <StatusBar style="dark" />

            {/* Clean Header */}
            <View
                style={[
                    styles.header,
                    { paddingTop: insets.top + 16 }
                ]}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={24} color="#1F2937" strokeWidth={2} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{name || "Chat Room"}</Text>
                    <View style={styles.onlineBadge}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.headerSubtitle}>Active</Text>
                    </View>
                </View>

                <View style={{ width: 40 }} />
            </View>

            {/* Divider */}
            <View style={styles.headerDivider} />

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                inverted
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: false })}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Text style={styles.emptyIcon}>💬</Text>
                        </View>
                        <Text style={styles.emptyTitle}>No messages yet</Text>
                        <Text style={styles.emptySubtitle}>Start the conversation!</Text>
                    </View>
                }
            />

            {/* Modern Input Area */}
            <View style={styles.inputContainer}>
                {/* Selected Image Preview */}
                {selectedImage && (
                    <View style={styles.imagePreviewContainer}>
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.imagePreview}
                        />
                        <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => setSelectedImage(null)}
                        >
                            <X size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.inputRow}>
                    <TouchableOpacity
                        style={styles.imageButton}
                        onPress={pickImage}
                        disabled={sending}
                    >
                        <ImageIcon size={22} color="#8B5CF6" />
                    </TouchableOpacity>

                    <View style={styles.textInputContainer}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Type a message..."
                            placeholderTextColor="#9CA3AF"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxHeight={100}
                            editable={!sending}
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            (!inputText.trim() && !selectedImage) || sending ? styles.sendButtonDisabled : null
                        ]}
                        onPress={sendMessage}
                        disabled={(!inputText.trim() && !selectedImage) || sending}
                    >
                        <Send size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        backgroundColor: "#FFFFFF",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerDivider: {
        height: 1,
        backgroundColor: "#E5E7EB",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    headerCenter: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        letterSpacing: -0.3,
    },
    onlineBadge: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#10B981",
        marginRight: 6,
    },
    headerSubtitle: {
        fontSize: 12,
        color: "#10B981",
        fontWeight: "600",
    },
    messagesList: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 20,
    },
    messageContainer: {
        marginBottom: 16,
        maxWidth: "80%",
    },
    myMessageContainer: {
        alignSelf: "flex-end",
    },
    otherMessageContainer: {
        alignSelf: "flex-start",
    },
    senderName: {
        fontSize: 12,
        color: "#6B7280",
        marginBottom: 4,
        marginLeft: 4,
        fontWeight: "500",
    },
    messageBubble: {
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    myMessageBubble: {
        backgroundColor: "#8B5CF6",
        borderBottomRightRadius: 4,
    },
    otherMessageBubble: {
        backgroundColor: "#FFFFFF",
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    myMessageText: {
        color: "#FFFFFF",
    },
    otherMessageText: {
        color: "#1F2937",
    },
    messageImage: {
        width: 240,
        height: 180,
        borderRadius: 12,
    },
    timestamp: {
        fontSize: 11,
        marginTop: 6,
        alignSelf: "flex-end",
    },
    myTimestamp: {
        color: "rgba(255,255,255,0.8)",
    },
    otherTimestamp: {
        color: "#9CA3AF",
    },
    emptyState: {
        paddingVertical: 60,
        alignItems: "center",
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    emptyIcon: {
        fontSize: 32,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: "#1F2937",
    },
    emptySubtitle: {
        fontSize: 15,
        color: "#6B7280",
        marginTop: 8,
    },
    inputContainer: {
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingTop: 8,
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    imagePreviewContainer: {
        marginBottom: 12,
        position: "relative",
    },
    imagePreview: {
        width: 120,
        height: 120,
        borderRadius: 12,
    },
    removeImageButton: {
        position: "absolute",
        top: 4,
        right: 4,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
    },
    imageButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    textInputContainer: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 8,
    },
    textInput: {
        fontSize: 15,
        color: "#1F2937",
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#8B5CF6",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    sendButtonDisabled: {
        opacity: 0.5,
        shadowOpacity: 0,
    },
});
