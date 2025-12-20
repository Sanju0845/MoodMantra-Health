import { useRef, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from "react-native";
import { WebView } from "react-native-webview";
import { Navigation } from "lucide-react-native";
import * as Location from "expo-location";

/**
 * OSMMapPicker - Interactive OpenStreetMap location picker
 * 
 * Features:
 * - Click anywhere on map to place marker
 * - Draggable marker for precise positioning
 * - GPS "Find My Location" button
 * - Returns coordinates via callback
 */
export default function OSMMapPicker({
    initialLatitude = 12.9716,
    initialLongitude = 77.5946,
    onLocationChange,
    style
}) {
    const webViewRef = useRef(null);

    // Handle messages from WebView (marker position changes)
    const handleWebViewMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "location_change") {
                onLocationChange?.(data.latitude, data.longitude);
            }
        } catch (e) {
            console.error("[OSMMapPicker] Error parsing message:", e);
        }
    };

    // Get device GPS location
    const handleFindMyLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                alert("Location permission denied");
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            // Send coordinates to WebView to update marker
            webViewRef.current?.injectJavaScript(`
        updateMarker(${latitude}, ${longitude});
        true;
      `);

            onLocationChange?.(latitude, longitude);
        } catch (error) {
            console.error("[OSMMapPicker] GPS error:", error);
            alert("Could not get your location");
        }
    };

    // Generate interactive map HTML
    const generateMapHTML = () => {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; width: 100%; }
          #map { height: 100%; width: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${initialLatitude}, ${initialLongitude}], 13);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          // Create draggable marker
          var marker = L.marker([${initialLatitude}, ${initialLongitude}], {
            draggable: true
          }).addTo(map);

          // Send position changes to React Native
          function sendLocationUpdate(lat, lng) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'location_change',
              latitude: lat,
              longitude: lng
            }));
          }

          // Handle marker drag
          marker.on('dragend', function(e) {
            var pos = marker.getLatLng();
            sendLocationUpdate(pos.lat, pos.lng);
          });

          // Handle map clicks
          map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            sendLocationUpdate(e.latlng.lat, e.latlng.lng);
          });

          // Function to update marker from React Native
          function updateMarker(lat, lng) {
            marker.setLatLng([lat, lng]);
            map.setView([lat, lng], 13);
            sendLocationUpdate(lat, lng);
          }
        </script>
      </body>
      </html>
    `;
    };

    return (
        <View style={[styles.container, style]}>
            <WebView
                ref={webViewRef}
                source={{ html: generateMapHTML() }}
                style={styles.map}
                onMessage={handleWebViewMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color="#4A9B7F" />
                    </View>
                )}
            />

            {/* GPS Location Button */}
            <TouchableOpacity
                style={styles.gpsButton}
                onPress={handleFindMyLocation}
            >
                <Navigation size={20} color="#FFFFFF" />
                <Text style={styles.gpsButtonText}>Find My Location</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        height: 300,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
    },
    map: {
        flex: 1,
    },
    loading: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
    },
    gpsButton: {
        position: "absolute",
        bottom: 16,
        right: 16,
        backgroundColor: "#4A9B7F",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    gpsButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
    },
});
