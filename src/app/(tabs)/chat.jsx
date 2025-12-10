import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Send, Bot, Sparkles } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../utils/api";
import { colors, spacing, borderRadius, fontSize, fontWeight, shadow } from "../../utils/theme";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (userId) {
        const response = await api.getChatHistory(userId);
        if (response.success && response.messages) {
          setMessages(response.messages);
        }
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = { role: "user", content: inputText.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText("");
    setSending(true);

    try {
      const response = await api.sendChatMessage(newMessages);

      if (response.success && response.reply) {
        setMessages([
          ...newMessages,
          { role: "assistant", content: response.reply },
        ]);
      }
    } catch (error) {
      console.error("Send message error:", error);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.lg,
          paddingHorizontal: spacing.lg,
          borderBottomLeftRadius: borderRadius.xl,
          borderBottomRightRadius: borderRadius.xl,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              padding: spacing.sm,
              borderRadius: borderRadius.full,
              marginRight: spacing.md,
            }}
          >
            <Bot color={colors.textWhite} size={28} />
          </View>
          <View>
            <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textWhite }}>
              Luna AI
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textWhite, opacity: 0.9 }}>
              Your Mental Health Companion
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: spacing.xxl }}>
            <View
              style={{
                backgroundColor: colors.primary + "20",
                padding: spacing.lg,
                borderRadius: borderRadius.full,
                marginBottom: spacing.lg,
              }}
            >
              <Sparkles color={colors.primary} size={48} />
            </View>
            <Text
              style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                color: colors.textDark,
                textAlign: "center",
                marginBottom: spacing.sm,
              }}
            >
              Start a Conversation
            </Text>
            <Text
              style={{
                fontSize: fontSize.md,
                color: colors.textMedium,
                textAlign: "center",
                lineHeight: 24,
              }}
            >
              Share your thoughts, feelings, and concerns with Luna,{"\n"}your AI mental health companion.
            </Text>
          </View>
        ) : (
          messages.map((message, index) => (
            <View
              key={index}
              style={{
                alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "80%",
                marginBottom: spacing.md,
              }}
            >
              <View
                style={{
                  backgroundColor: message.role === "user" ? colors.primary : colors.cardBackground,
                  borderRadius: borderRadius.lg,
                  borderBottomRightRadius: message.role === "user" ? spacing.xs : borderRadius.lg,
                  borderBottomLeftRadius: message.role === "user" ? borderRadius.lg : spacing.xs,
                  padding: spacing.md,
                  ...shadow.sm,
                }}
              >
                <Text
                  style={{
                    fontSize: fontSize.md,
                    color: message.role === "user" ? colors.textWhite : colors.textDark,
                    lineHeight: 22,
                  }}
                >
                  {message.content}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: fontSize.xs,
                  color: colors.textLight,
                  marginTop: spacing.xs,
                  alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {message.role === "user" ? "You" : "Luna"}
              </Text>
            </View>
          ))
        )}

        {sending && (
          <View style={{ alignSelf: "flex-start", maxWidth: "80%", marginBottom: spacing.md }}>
            <View
              style={{
                backgroundColor: colors.cardBackground,
                borderRadius: borderRadius.lg,
                borderBottomLeftRadius: spacing.xs,
                padding: spacing.md,
                ...shadow.sm,
              }}
            >
              <ActivityIndicator color={colors.primary} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          paddingBottom: insets.bottom + spacing.md,
          backgroundColor: colors.cardBackground,
          borderTopWidth: 1,
          borderColor: colors.border,
          flexDirection: "row",
          alignItems: "flex-end",
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            maxHeight: 120,
          }}
        >
          <TextInput
            style={{
              fontSize: fontSize.md,
              color: colors.textDark,
            }}
            placeholder="Type your message..."
            placeholderTextColor={colors.textLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!sending}
          />
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: !inputText.trim() || sending ? colors.textLight : colors.primary,
            width: 48,
            height: 48,
            borderRadius: borderRadius.full,
            alignItems: "center",
            justifyContent: "center",
            ...shadow.sm,
          }}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.7}
        >
          <Send color={colors.textWhite} size={20} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
