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
  Image,
  Modal,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Send, Bot, Sparkles, Heart, ArrowLeft, Mic, Zap } from "lucide-react-native";
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
  const [voiceCredits, setVoiceCredits] = useState(0);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  useEffect(() => {
    loadChatHistory();
    preloadChatContext();
    loadVoiceCredits();
  }, []);

  const loadVoiceCredits = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (userId) {
        // Fetch user's voice credits from API
        const response = await api.getProfile();
        if (response.success && response.userData) {
          setVoiceCredits(response.userData.voiceCredits || 0);
        }
      }
    } catch (error) {
      console.error("Error loading voice credits:", error);
    }
  };

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

  // Preload context used by the chatbot (assessments + doctors),
  // mirroring the web app's behavior with localStorage.
  const preloadChatContext = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      // Fetch full user assessments and doctors list
      const [assessmentsData, doctorsData] = await Promise.all([
        api.getUserAssessments(userId).catch(() => null),
        api.getDoctors().catch(() => null),
      ]);

      if (assessmentsData) {
        await AsyncStorage.setItem("userAssessments", JSON.stringify(assessmentsData));
      }
      if (doctorsData?.doctors) {
        await AsyncStorage.setItem("doctors", JSON.stringify(doctorsData.doctors));
      }
    } catch (error) {
      console.log("[Chat] Error preloading chat context:", error);
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

  const handleClearChat = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (userId) {
        await api.deleteChatHistory(userId);
      }
    } catch (error) {
      console.error("Clear chat error:", error);
    } finally {
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: "Hi, I am Raska your Mental Wellness Assistant. How are you feeling today?",
        },
      ]);
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
            <Image
              source={{ uri: "https://raskamon.com/raskabot.jpg" }}
              style={styles.headerAvatarImage}
            />
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
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClearChat} activeOpacity={0.8}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
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
                <Image
                  source={{ uri: "https://raskamon.com/raskabot.jpg" }}
                  style={styles.botAvatarImage}
                />
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
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={styles.micButton}
          onPress={() => {
            if (voiceCredits > 0) {
              Alert.alert("Voice Feature", "Voice input coming soon!");
            } else {
              setShowCreditsModal(true);
            }
          }}
          activeOpacity={0.7}
        >
          <Mic size={20} color="#4A9B7F" />
        </TouchableOpacity>
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

      {/* Credits Modal */}
      <Modal
        visible={showCreditsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreditsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <LinearGradient
              colors={["#F59E0B", "#F97316"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalHeaderGradient}
            >
              <Zap size={40} color="#FFFFFF" />
              <Text style={styles.modalTitle}>Voice Credits</Text>
            </LinearGradient>

            {/* Credits Display */}
            <View style={styles.creditsDisplay}>
              <View style={styles.creditsRow}>
                <Text style={styles.creditsLabel}>Available Credits</Text>
                <Text style={styles.creditsValue}>{voiceCredits}</Text>
              </View>
              <View style={styles.creditsDivider} />
              <View style={styles.creditsRow}>
                <Text style={styles.creditsLabel}>Cost per use</Text>
                <Text style={styles.creditsValue}>1 credit</Text>
              </View>
            </View>

            {/* Info Text */}
            <View style={styles.infoBox}>
              <Sparkles size={20} color="#4A9B7F" />
              <Text style={styles.infoText}>
                Voice features let you speak naturally with Raska. Each voice message uses 1 credit.
              </Text>
            </View>

            {/* Features List */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>Natural voice conversations</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>Real-time speech recognition</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>Hands-free interaction</Text>
              </View>
            </View>

            {/* Upgrade Button */}
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => {
                setShowCreditsModal(false);
                setTimeout(() => {
                  Alert.alert(
                    "Coming Soon! 🚀",
                    "Voice credits will be available for purchase soon. Stay tuned for updates!",
                    [{ text: "OK" }]
                  );
                }, 300);
              }}
            >
              <LinearGradient
                colors={["#4A9B7F", "#3B8068"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeButtonGradient}
              >
                <View style={styles.upgradeButtonContent}>
                  <Text style={styles.upgradeButtonText}>Get More Credits</Text>
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowCreditsModal(false)}
            >
              <Text style={styles.closeModalText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    resizeMode: "cover",
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
  headerRight: {
    width: 60,
    alignItems: "flex-end",
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  clearButtonText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
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
  botAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    resizeMode: "cover",
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
    paddingTop: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E6F4F0",
    gap: 10,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E6F4F0",
    justifyContent: "center",
    alignItems: "center",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    width: "100%",
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeaderGradient: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  creditsDisplay: {
    backgroundColor: "#F9FAFB",
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  creditsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  creditsLabel: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
  creditsValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  creditsDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#E6F4F0",
    marginHorizontal: 24,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },
  featuresList: {
    marginHorizontal: 24,
    marginTop: 20,
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4A9B7F",
  },
  featureText: {
    fontSize: 14,
    color: "#4B5563",
    flex: 1,
  },
  upgradeButton: {
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#4A9B7F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  upgradeButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeButtonContent: {
    alignItems: "center",
    gap: 6,
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  comingSoonBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  closeModalButton: {
    paddingVertical: 16,
    marginTop: 12,
    marginBottom: 32,
    alignItems: "center",
  },
  closeModalText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
});
