import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  const [isChecking, setIsChecking] = useState(true);
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    checkAppStatus();
  }, []);

  const checkAppStatus = async () => {
    try {
      // Check if onboarding was completed
      const hasSeenOnboarding = await AsyncStorage.getItem("hasSeenOnboarding");

      if (!hasSeenOnboarding) {
        // First time user - show onboarding
        setDestination("/onboarding");
      } else {
        // Check if logged in
        const token = await AsyncStorage.getItem("token");
        if (token && token.split(".").length === 3) {
          setDestination("/(tabs)/home");
        } else {
          setDestination("/auth/login");
        }
      }
    } catch (error) {
      console.error("Error checking app status:", error);
      setDestination("/auth/login");
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking || !destination) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F8FAFC",
        }}
      >
        <ActivityIndicator size="large" color="#4A9B7F" />
      </View>
    );
  }

  return <Redirect href={destination} />;
}
