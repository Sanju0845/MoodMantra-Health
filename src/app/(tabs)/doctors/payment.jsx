import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    StyleSheet,
    Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { ArrowLeft, CheckCircle, XCircle, CreditCard, Shield } from "lucide-react-native";
import api from "../../../utils/api";

// Razorpay Key - should match backend
const RAZORPAY_KEY_ID = "rzp_test_7sJWblV6pIQGop"; // Test key from backend

export default function PaymentScreen() {
    const router = useRouter();
    const { appointmentId, amount, doctorName } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const webViewRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [paymentOrder, setPaymentOrder] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState("pending"); // pending, processing, success, failed
    const [error, setError] = useState(null);

    useEffect(() => {
        if (appointmentId) {
            initiatePayment();
        }
    }, [appointmentId]);

    const initiatePayment = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log("[Payment] Initiating payment for appointment:", appointmentId);
            const response = await api.initiatePayment(appointmentId);

            if (response.success && response.order) {
                console.log("[Payment] Order created:", response.order.id);
                setPaymentOrder(response.order);
            } else {
                throw new Error(response.message || "Failed to create payment order");
            }
        } catch (err) {
            console.error("[Payment] Error:", err);
            setError(err.message);
            setPaymentStatus("failed");
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = async (paymentData) => {
        try {
            setPaymentStatus("processing");
            console.log("[Payment] Verifying payment:", paymentData);

            const response = await api.verifyPayment(
                paymentData.razorpay_order_id,
                paymentData.razorpay_payment_id,
                paymentData.razorpay_signature
            );

            if (response.success) {
                setPaymentStatus("success");
                setTimeout(() => {
                    router.replace("/(tabs)/profile/appointments");
                }, 2000);
            } else {
                throw new Error(response.message || "Payment verification failed");
            }
        } catch (err) {
            console.error("[Payment] Verification error:", err);
            setPaymentStatus("failed");
            setError(err.message);
        }
    };

    const handlePaymentFailure = async (error) => {
        console.log("[Payment] Payment failed:", error);
        setPaymentStatus("failed");
        setError(error?.description || "Payment was not completed");

        // Cancel the payment reservation
        try {
            await api.cancelPayment(appointmentId);
        } catch (e) {
            console.log("[Payment] Failed to cancel payment reservation");
        }
    };

    const handleWebViewMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log("[Payment] WebView message:", data);

            if (data.type === "payment_success") {
                handlePaymentSuccess(data.data);
            } else if (data.type === "payment_failed") {
                handlePaymentFailure(data.data);
            } else if (data.type === "payment_cancelled") {
                handlePaymentFailure({ description: "Payment was cancelled" });
            }
        } catch (e) {
            console.log("[Payment] Error parsing WebView message:", e);
        }
    };

    // Generate Razorpay checkout HTML
    const generatePaymentHTML = () => {
        if (!paymentOrder) return "";

        // --- MOCK PAYMENT FLOW (For new Supabase Doctors) ---
        // Since backend Razorpay keys don't work for these new local appointments yet.
        if (paymentOrder.id && paymentOrder.id.startsWith("order_mock_")) {
            return `
              <!DOCTYPE html>
              <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body {
                    margin: 0;
                    padding: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #F8FAFC;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                  }
                  .loader {
                    border: 4px solid #f3f3f3;
                    border-radius: 50%;
                    border-top: 4px solid #6366F1;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin-bottom: 20px;
                  }
                  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                  h2 { color: #1F2937; margin: 0 0 10px 0; }
                  p { color: #6B7280; text-align: center; }
                </style>
              </head>
              <body>
                <div class="loader"></div>
                <h2>Processing Payment</h2>
                <p>Securely confirming your appointment...</p>
                <script>
                  // Simulate successful payment processing
                  setTimeout(function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: "payment_success",
                      data: {
                        razorpay_order_id: "${paymentOrder.id}",
                        razorpay_payment_id: "pay_mock_" + Date.now(),
                        razorpay_signature: "sig_mock_" + Date.now()
                      }
                    }));
                  }, 2000);
                </script>
              </body>
              </html>
            `;
        }

        // --- REAL RAZORPAY FLOW ---
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: white;
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 350px;
            width: 100%;
          }
          .amount {
            font-size: 36px;
            font-weight: 700;
            color: #1F2937;
            margin: 20px 0;
          }
          .doctor {
            font-size: 16px;
            color: #6B7280;
            margin-bottom: 20px;
          }
          .pay-btn {
            background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
            color: white;
            border: none;
            padding: 16px 40px;
            border-radius: 12px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            margin-top: 10px;
          }
          .secure {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 20px;
            color: #10B981;
            font-size: 14px;
          }
          .loading {
            color: #6B7280;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 style="color: #1F2937; margin: 0;">Complete Payment</h2>
          <p class="doctor">Appointment with ${doctorName || "Doctor"}</p>
          <div class="amount">₹${paymentOrder.amount / 100}</div>
          <button class="pay-btn" onclick="openRazorpay()">Pay Now</button>
          <div class="secure">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Secured by Razorpay
          </div>
        </div>
        
        <script>
          function openRazorpay() {
            var options = {
              key: "${RAZORPAY_KEY_ID}",
              amount: ${paymentOrder.amount},
              currency: "${paymentOrder.currency || "INR"}",
              name: "MoodMantra",
              description: "Appointment Payment",
              order_id: "${paymentOrder.id}",
              prefill: {
                name: "",
                email: "",
                contact: ""
              },
              theme: {
                color: "#6366F1"
              },
              handler: function(response) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: "payment_success",
                  data: response
                }));
              },
              modal: {
                ondismiss: function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: "payment_cancelled"
                  }));
                }
              }
            };
            
            var rzp = new Razorpay(options);
            rzp.on("payment.failed", function(response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "payment_failed",
                data: response.error
              }));
            });
            rzp.open();
          }
          
          // Auto-open Razorpay after 500ms
          setTimeout(openRazorpay, 500);
        </script>
      </body>
      </html>
    `;
    };

    // Success Screen
    if (paymentStatus === "success") {
        return (
            <View style={[styles.container, styles.statusContainer]}>
                <StatusBar style="dark" />
                <View style={styles.statusContent}>
                    <View style={[styles.statusIcon, { backgroundColor: "#D1FAE5" }]}>
                        <CheckCircle size={60} color="#10B981" />
                    </View>
                    <Text style={styles.statusTitle}>Payment Successful!</Text>
                    <Text style={styles.statusMessage}>
                        Your appointment has been confirmed. You will be redirected shortly.
                    </Text>
                    <ActivityIndicator size="small" color="#6366F1" style={{ marginTop: 20 }} />
                </View>
            </View>
        );
    }

    // Failed Screen
    if (paymentStatus === "failed") {
        return (
            <View style={[styles.container, styles.statusContainer]}>
                <StatusBar style="dark" />
                <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft color="#1F2937" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Payment</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.statusContent}>
                    <View style={[styles.statusIcon, { backgroundColor: "#FEE2E2" }]}>
                        <XCircle size={60} color="#EF4444" />
                    </View>
                    <Text style={styles.statusTitle}>Payment Failed</Text>
                    <Text style={styles.statusMessage}>
                        {error || "Something went wrong. Please try again."}
                    </Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                            setPaymentStatus("pending");
                            setError(null);
                            initiatePayment();
                        }}
                    >
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.cancelButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Loading Screen
    if (loading) {
        return (
            <View style={[styles.container, styles.statusContainer]}>
                <StatusBar style="dark" />
                <View style={styles.statusContent}>
                    <View style={[styles.statusIcon, { backgroundColor: "#EEF2FF" }]}>
                        <CreditCard size={50} color="#6366F1" />
                    </View>
                    <Text style={styles.statusTitle}>Preparing Payment</Text>
                    <Text style={styles.statusMessage}>Please wait while we set up your payment...</Text>
                    <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 24 }} />
                </View>
            </View>
        );
    }

    // Processing Screen
    if (paymentStatus === "processing") {
        return (
            <View style={[styles.container, styles.statusContainer]}>
                <StatusBar style="dark" />
                <View style={styles.statusContent}>
                    <View style={[styles.statusIcon, { backgroundColor: "#FEF3C7" }]}>
                        <Shield size={50} color="#F59E0B" />
                    </View>
                    <Text style={styles.statusTitle}>Verifying Payment</Text>
                    <Text style={styles.statusMessage}>Please wait while we verify your payment...</Text>
                    <ActivityIndicator size="large" color="#F59E0B" style={{ marginTop: 24 }} />
                </View>
            </View>
        );
    }

    // Payment WebView
    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color="#1F2937" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Complete Payment</Text>
                <View style={{ width: 40 }} />
            </View>

            {paymentOrder && (
                <WebView
                    ref={webViewRef}
                    source={{ html: generatePaymentHTML() }}
                    style={{ flex: 1 }}
                    onMessage={handleWebViewMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <View style={styles.webviewLoading}>
                            <ActivityIndicator size="large" color="#6366F1" />
                        </View>
                    )}
                    onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.log("[Payment] WebView error:", nativeEvent);
                        setError("Failed to load payment page");
                        setPaymentStatus("failed");
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    statusContainer: {
        justifyContent: "center",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
    },
    statusContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
    },
    statusIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    statusTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 12,
        textAlign: "center",
    },
    statusMessage: {
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 24,
    },
    retryButton: {
        backgroundColor: "#6366F1",
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 14,
        marginTop: 32,
        width: "100%",
        alignItems: "center",
    },
    retryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    cancelButton: {
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 14,
        marginTop: 12,
        width: "100%",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    cancelButtonText: {
        color: "#6B7280",
        fontSize: 16,
        fontWeight: "600",
    },
    webviewLoading: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
    },
});
