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
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Send, Bot, Sparkles, Heart, ArrowLeft } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import api from "../../utils/api";

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      id: "1",
      role: "assistant",
      content: "Hi, I am Raska your Mental Wellness Assistant. How are you feeling today?",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (userId) {
        const response = await api.getChatHistory(userId);
        if (response.success && response.messages && response.messages.length > 0) {
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
    const messageText = inputText.trim();
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText("");
    setSending(true);

    try {
      // Get userId for the API call
      const userId = await AsyncStorage.getItem("userId");

      // --- PERSONAL CONTEXT INJECTION ---
      // Fetch latest stats to give the AI "awareness"
      let contextStr = "";
      try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Water
        const waterLogs = await api.fetchWaterLog(userId) || [];
        const waterToday = waterLogs.find(l => l.date === today);
        const glasses = waterToday ? Math.round(waterToday.amount_ml / 250) : 0;

        // 2. Sleep
        const sleepLogs = await api.fetchSleepLogs(userId) || [];
        const sleepLastNight = sleepLogs[0]; // Assuming sorted desc
        let sleepHrs = 0;
        if (sleepLastNight && sleepLastNight.notes) {
          sleepHrs = parseFloat(sleepLastNight.notes.match(/Duration: (\d+(\.\d+)?)h/)?.[1] || 0);
        }

        // 3. Mood
        const moodLogs = await api.getMoodEntries(userId, 1, 1);
        const latestMood = moodLogs?.entries?.[0]?.mood_label || "Unknown";

        contextStr = `\n\n[System Context: Today's Water: ${glasses} glasses. Last Sleep: ${sleepHrs} hours. Latest Mood: ${latestMood}. Please integrate this into your answer naturally if asked.]`;
      } catch (e) {
        console.log("Context fetch error:", e);
      }

      // Append context hiddenly
      const fullMessage = messageText + contextStr;

      // Send single message with userId (matching web app format)
      const response = await api.sendChatMessage(fullMessage, userId);

      if (response.success && response.reply) {
        setMessages([
          ...newMessages,
          { role: "assistant", content: response.reply },
        ]);
      } else {
        throw new Error(response.message || "Failed to get response");
      }
    } catch (error) {
      console.error("Send message error:", error);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "I'm sorry, I'm experiencing some technical difficulties right now. Please try again in a moment."
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={["#4A9B7F", "#3B8068"]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerAvatar}>
            <Bot size={24} color="#4A9B7F" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Raska</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.headerSubtitle}>
                Here to support you
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 1 && (
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeIconContainer}>
              <Sparkles size={32} color="#4A9B7F" />
            </View>
            <Text style={styles.welcomeTitle}>Welcome to Raska</Text>
            <Text style={styles.welcomeText}>
              Your AI mental wellness companion. Share your thoughts,
              feelings, and concerns in a safe space.
            </Text>
          </View>
        )}

        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageRow,
              message.role === "user" ? styles.messageRowUser : styles.messageRowBot,
            ]}
          >
            {message.role !== "user" && (
              <View style={styles.botAvatar}>
                <Bot size={16} color="#4A9B7F" />
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                message.role === "user"
                  ? styles.userBubble
                  : styles.botBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.role === "user"
                    ? styles.userText
                    : styles.botText,
                ]}
              >
                {message.content}
              </Text>
            </View>
          </View>
        ))}

        {sending && (
          <View style={[styles.messageRow, styles.messageRowBot]}>
            <View style={styles.botAvatar}>
              <Bot size={16} color="#4A9B7F" />
            </View>
            <View style={[styles.messageBubble, styles.botBubble]}>
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color="#4A9B7F" />
                <Text style={styles.typingText}>Thinking...</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 90 }]}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Share what's on your mind..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!sending}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.7}
        >
          <Send size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#A7F3D0",
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },
  headerSpacer: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 100,
  },
  welcomeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E6F4F0",
  },
  welcomeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E6F4F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowBot: {
    justifyContent: "flex-start",
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E6F4F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#4A9B7F",
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E6F4F0",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: "#FFFFFF",
  },
  botText: {
    color: "#1F2937",
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#6B7280",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E6F4F0",
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  input: {
    fontSize: 15,
    color: "#1F2937",
    maxHeight: 80,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4A9B7F",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  privacyFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  privacyText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
});
