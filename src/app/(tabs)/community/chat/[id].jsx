import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Paperclip, Image as ImageIcon } from 'lucide-react-native';
import { supabase } from '../../../../utils/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import api from '../../../../utils/api';

export default function ChatRoom() {
    const { id, name, icon } = useLocalSearchParams();
    const router = useRouter();
    const navigation = useNavigation();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const flatListRef = useRef(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [onlineCount, setOnlineCount] = useState(0);

    // Hide tab bar IMMEDIATELY when this screen mounts
    useLayoutEffect(() => {
        const parent = navigation.getParent();
        parent?.setOptions({
            tabBarStyle: { display: 'none' }
        });

        return () => {
            // Reset to default - let parent _layout.jsx handle the style
            parent?.setOptions({
                tabBarStyle: undefined
            });
        };
    }, [navigation]);

    useEffect(() => {
        loadUserAndMessages();

        // Subscribe to real-time messages
        const channel = supabase
            .channel(`room-${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'community_messages',
                    filter: `room_id=eq.${id}`,
                },
                (payload) => {
                    console.log('New message received:', payload.new);
                    // Only add if not from current user (to prevent duplicates)
                    setMessages((current) => {
                        const exists = current.find(m => m.id === payload.new.id);
                        if (exists) return current;
                        return [...current, payload.new];
                    });
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    const loadUserAndMessages = async () => {
        try {
            // Get current user from API profile
            const profileResponse = await api.getProfile();

            if (profileResponse.success && profileResponse.userData) {
                const userData = profileResponse.userData;
                setCurrentUser({
                    id: userData._id,
                    name: userData.name || 'User',
                    avatar: userData.image || null,
                });
            } else {
                // Fallback to AsyncStorage
                const userId = await AsyncStorage.getItem('userId');
                const userName = await AsyncStorage.getItem('userName') || 'User';
                const userAvatar = await AsyncStorage.getItem('userAvatar') || null;
                setCurrentUser({ id: userId, name: userName, avatar: userAvatar });
            }

            // Fetch existing messages
            const { data, error } = await supabase
                .from('community_messages')
                .select('*')
                .eq('room_id', id)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error loading messages:', error);
            } else {
                setMessages(data || []);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        // Image upload temporarily disabled
        Alert.alert('Coming Soon', 'Image upload feature is under development and will be available soon!');
        return;
    };

    const uploadImage = async (uri) => {
        if (!currentUser?.id) return;

        setUploading(true);
        try {
            const filename = `${currentUser.id}_${Date.now()}.jpg`;

            // Create FormData for upload
            const formData = new FormData();
            formData.append('file', {
                uri: uri,
                type: 'image/jpeg',
                name: filename,
            });

            // Get Supabase config
            const supabaseUrl = 'https://swcajhaxbtvnpjvuaefa.supabase.co';
            const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Y2FqaGF4YnR2bnBqdnVhZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxNTY2MDgsImV4cCI6MjA0OTczMjYwOH0.NJpIb2v8cYJHjlnXTy4X2rwSiwV5KO3oB4NtFugb1jk'; // from supabaseClient

            // Upload using fetch
            const uploadResponse = await fetch(
                `${supabaseUrl}/storage/v1/object/community-images/${filename}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                    },
                    body: formData,
                }
            );

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.status}`);
            }

            // Get public URL
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/community-images/${filename}`;

            // Send message with image URL
            const { data, error } = await supabase
                .from('community_messages')
                .insert({
                    room_id: id,
                    user_id: currentUser.id,
                    user_name: currentUser.name,
                    user_avatar: currentUser.avatar,
                    content: '📷 Image',
                    file_url: publicUrl,
                    file_type: 'image',
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;

            // Manually add message to state
            if (data) {
                setMessages((current) => [...current, data]);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert('Upload Failed', error.message || 'Failed to upload image. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim() || sending || !currentUser?.id) return;

        const messageText = inputText.trim();
        setInputText('');
        setSending(true);

        try {
            const { data, error } = await supabase
                .from('community_messages')
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

            if (error) throw error;

            // Manually add message to state immediately
            if (data) {
                setMessages((current) => [...current, data]);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert('Error', 'Failed to send message. Please try again.');
            setInputText(messageText);
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item, index }) => {
        const isMe = item.user_id === currentUser?.id;
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showUserInfo = !prevMessage || prevMessage.user_id !== item.user_id;

        return (
            <View style={styles.messageContainer}>
                {/* Show name and timestamp above message */}
                {showUserInfo && !isMe && (
                    <View style={styles.messageHeader}>
                        <Text style={styles.senderName}>{item.user_name || 'Anonymous'}</Text>
                        <Text style={styles.messageTime}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                )}

                <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}>
                    {!isMe && showUserInfo && (
                        <View style={styles.avatarContainer}>
                            <Image
                                source={{ uri: item.user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user_name || 'U')}&background=4A9B7F&color=fff` }}
                                style={styles.avatar}
                            />
                        </View>
                    )}
                    {!isMe && !showUserInfo && <View style={styles.avatarSpacer} />}

                    <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
                        {/* Render image if file_type is image */}
                        {item.file_type === 'image' && item.file_url && (
                            <Image
                                source={{ uri: item.file_url }}
                                style={styles.messageImage}
                                resizeMode="cover"
                            />
                        )}

                        <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                            {item.content}
                        </Text>
                    </View>
                </View>

                {/* Show timestamp for own messages */}
                {isMe && (
                    <View style={styles.myMessageHeader}>
                        <Text style={styles.myMessageTime}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.push('/(tabs)/community')} style={styles.backButton}>
                    <ChevronLeft color="#1F2937" size={24} />
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>{name || 'Chat Room'}</Text>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                style={styles.keyboardView}
            >
                {loading ? (
                    <View style={styles.centerLoading}>
                        <ActivityIndicator size="large" color="#4A9B7F" />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.messagesList}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
                            </View>
                        }
                    />
                )}

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder={uploading ? "Uploading image..." : "Type a message..."}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={1000}
                            editable={!uploading}
                        />
                        <TouchableOpacity style={styles.imageButton} onPress={pickImage} disabled={uploading}>
                            {uploading ? (
                                <ActivityIndicator size="small" color="#4A9B7F" />
                            ) : (
                                <ImageIcon size={20} color="#9CA3AF" />
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.sendButton, ((!inputText.trim() && !uploading) || sending) && styles.sendButtonDisabled]}
                        onPress={sendMessage}
                        disabled={(!inputText.trim() && !uploading) || sending}
                    >
                        <Send size={20} color="#FFFFFF" style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1F2937',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 2,
    },
    keyboardView: {
        flex: 1,
    },
    centerLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messagesList: {
        padding: 16,
        paddingBottom: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 15,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 12,
        fontWeight: '500',
    },
    messageContainer: {
        marginBottom: 16,
    },
    messageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        marginLeft: 44,
    },
    senderName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
        marginRight: 8,
    },
    messageTime: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
    },
    myMessageHeader: {
        alignItems: 'flex-end',
        marginTop: 4,
        marginRight: 8,
    },
    myMessageTime: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    myMessageRow: {
        justifyContent: 'flex-end',
    },
    theirMessageRow: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        marginRight: 10,
    },
    avatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#E2E8F0',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    avatarSpacer: {
        width: 44,
    },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 12,
        marginBottom: 6,
    },
    myBubble: {
        backgroundColor: '#4A9B7F',
        borderBottomRightRadius: 4,
        shadowColor: '#4A9B7F',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    theirBubble: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 21,
        letterSpacing: 0.1,
    },
    myMessageText: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
    theirMessageText: {
        color: '#1E293B',
        fontWeight: '400',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    attachButton: {
        padding: 10,
        marginRight: 10,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 46,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
    },
    input: {
        flex: 1,
        fontSize: 15,
        maxHeight: 100,
        color: '#1E293B',
        fontWeight: '400',
    },
    imageButton: {
        marginLeft: 10,
        padding: 4,
    },
    sendButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#4A9B7F',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
        shadowColor: '#4A9B7F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 5,
    },
    sendButtonDisabled: {
        backgroundColor: '#D1FAE5',
        shadowOpacity: 0,
        elevation: 0,
    },
});
