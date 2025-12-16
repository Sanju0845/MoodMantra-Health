import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Image,
    Dimensions,
    Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { ArrowLeft, MapPin, Star, Navigation, Phone, Clock } from "lucide-react-native";
import * as Location from 'expo-location';
import api from "../../../utils/api";

const { width } = Dimensions.get("window");

export default function NearMeDoctorsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const webViewRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [viewMode, setViewMode] = useState("map"); // "map" or "list"
    const [userLocation, setUserLocation] = useState(null);
    const [permissionStatus, setPermissionStatus] = useState(null);

    useEffect(() => {
        // 1. First get location, then load doctors to calculate distance
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                setPermissionStatus(status);

                let location = null;
                if (status === 'granted') {
                    console.log("[NearMe] Getting user location...");
                    location = await Location.getCurrentPositionAsync({});
                    setUserLocation(location.coords);
                } else {
                    console.log("[NearMe] Location permission denied");
                    // We don't alert annoyingly, just continue
                }

                await loadDoctors(location?.coords);
            } catch (error) {
                console.error("[NearMe] Init Error:", error);
                await loadDoctors(null);
            }
        })();
    }, []);

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return parseFloat(d.toFixed(1));
    };

    const deg2rad = (deg) => {
        return deg * (Math.PI / 180);
    };

    const loadDoctors = async (coords) => {
        try {
            setLoading(true);
            const response = await api.getDoctors();
            if (response.success && response.doctors) {
                // Filter doctors that have coordinates
                let validDoctors = response.doctors.filter(d => d.latitude && d.longitude);
                console.log(`[NearMe] Found ${validDoctors.length} doctors with location.`);

                // Calculate distances if we have user location
                if (coords) {
                    validDoctors = validDoctors.map(doc => ({
                        ...doc,
                        distance: calculateDistance(
                            coords.latitude,
                            coords.longitude,
                            parseFloat(doc.latitude),
                            parseFloat(doc.longitude)
                        )
                    }));

                    // SORT BY DISTANCE
                    validDoctors.sort((a, b) => a.distance - b.distance);
                }

                setDoctors(validDoctors);
            }
        } catch (error) {
            console.error("Error loading doctors:", error);
        } finally {
            setLoading(false);
        }
    };

    // Generate OpenStreetMap HTML (With User Location Marker)
    const generateMapHTML = () => {
        const markers = doctors.map((doc, index) => `
      L.marker([${doc.latitude}, ${doc.longitude}])
        .addTo(map)
        .bindPopup('<b>${doc.name}</b><br>${doc.speciality}<br>₹${doc.fees}<br>${doc.distance ? doc.distance + ' km away' : ''}')
        .on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'marker_click', id: '${doc._id}'}));
        });
    `).join('\n');

        // User Location Marker (Blue)
        const userMarker = userLocation ? `
            var userIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
            L.marker([${userLocation.latitude}, ${userLocation.longitude}], {icon: userIcon})
             .addTo(map)
             .bindPopup("<b>You are here</b>")
             .openPopup();
        ` : '';

        // Default to Bangalore if no user location, else center on user
        const initialLat = userLocation ? userLocation.latitude : 12.9716;
        const initialLng = userLocation ? userLocation.longitude : 77.5946;

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
          .leaflet-popup-content-wrapper { border-radius: 12px; }
          .leaflet-popup-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px; line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${initialLat}, ${initialLng}], 12);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);
          
          ${markers}
          ${userMarker}
          
          // Fit bounds to show doctors AND user
          var points = [
              ${doctors.map(d => `[${d.latitude}, ${d.longitude}]`).join(',')}
              ${userLocation ? `,[${userLocation.latitude}, ${userLocation.longitude}]` : ''}
          ];
          
          if (points.length > 0) {
              var bounds = L.latLngBounds(points);
              if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
              }
          }
        </script>
      </body>
      </html>
    `;
    };

    const handleWebViewMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'marker_click') {
                const doctor = doctors.find(d => d._id === data.id);
                setSelectedDoctor(doctor);
            }
        } catch (e) {
            console.log("Error parsing WebView message:", e);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Accessing location & finding doctors...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft color="#1F2937" size={24} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Doctors Near Me</Text>
                    {userLocation && <Text style={styles.locationSubtitle}>Using current location</Text>}
                </View>
                <View style={styles.viewToggle}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === "map" && styles.toggleBtnActive]}
                        onPress={() => setViewMode("map")}
                    >
                        <MapPin size={16} color={viewMode === "map" ? "#FFFFFF" : "#6B7280"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
                        onPress={() => setViewMode("list")}
                    >
                        <Text style={[styles.toggleText, viewMode === "list" && styles.toggleTextActive]}>List</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Map View */}
            {viewMode === "map" && (
                <View style={styles.mapContainer}>
                    <WebView
                        ref={webViewRef}
                        source={{ html: generateMapHTML() }}
                        style={styles.map}
                        onMessage={handleWebViewMessage}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        startInLoadingState={true}
                        renderLoading={() => (
                            <View style={styles.mapLoading}>
                                <ActivityIndicator size="large" color="#6366F1" />
                            </View>
                        )}
                    />

                    {/* Selected Doctor Card */}
                    {selectedDoctor && (
                        <View style={styles.selectedCard}>
                            <Image
                                source={{ uri: selectedDoctor.image || "https://via.placeholder.com/60" }}
                                style={styles.selectedImage}
                            />
                            <View style={styles.selectedInfo}>
                                <Text style={styles.selectedName}>{selectedDoctor.name}</Text>
                                <Text style={styles.selectedSpecialty}>{selectedDoctor.speciality}</Text>
                                <View style={styles.selectedMeta}>
                                    <Star size={14} color="#F59E0B" fill="#F59E0B" />
                                    <Text style={styles.selectedRating}>4.8</Text>
                                    <Text style={styles.selectedFee}>₹{selectedDoctor.fees}</Text>
                                    {selectedDoctor.distance && (
                                        <Text style={styles.distanceBadge}>{selectedDoctor.distance} km</Text>
                                    )}
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.bookBtn}
                                onPress={() => router.push(`/doctors/${selectedDoctor._id}`)}
                            >
                                <Text style={styles.bookBtnText}>Book</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {/* List View */}
            {viewMode === "list" && (
                <ScrollView
                    contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 20 }]}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.listTitle}>
                        {doctors.length} Doctors Found {userLocation ? "(Sorted by Distance)" : ""}
                    </Text>

                    {doctors.map((doctor) => (
                        <TouchableOpacity
                            key={doctor._id}
                            style={styles.doctorCard}
                            onPress={() => router.push(`/doctors/${doctor._id}`)}
                        >
                            <Image
                                source={{ uri: doctor.image || "https://via.placeholder.com/80" }}
                                style={styles.doctorImage}
                            />
                            <View style={styles.doctorInfo}>
                                <Text style={styles.doctorName}>{doctor.name}</Text>
                                <Text style={styles.doctorSpecialty}>{doctor.speciality}</Text>

                                <View style={styles.doctorMeta}>
                                    <View style={styles.metaItem}>
                                        <Star size={14} color="#F59E0B" fill="#F59E0B" />
                                        <Text style={styles.metaText}>4.8</Text>
                                    </View>
                                    <View style={styles.metaItem}>
                                        <Clock size={14} color="#6B7280" />
                                        <Text style={styles.metaText}>{doctor.experience || "5+ yrs"}</Text>
                                    </View>
                                </View>

                                <View style={styles.doctorFooter}>
                                    <View style={styles.locationRow}>
                                        <MapPin size={14} color="#10B981" />
                                        <Text style={styles.locationText}>
                                            {doctor.distance ? `${doctor.distance} km away` : (doctor.location || "Nearby")}
                                        </Text>
                                    </View>
                                    <Text style={styles.doctorFee}>₹{doctor.fees}</Text>
                                </View>
                            </View>

                            {doctor.available && (
                                <View style={styles.availableDot} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
    },
    loadingText: {
        marginTop: 16,
        color: "#6B7280",
        fontSize: 16,
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
    backBtn: {
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
    locationSubtitle: {
        fontSize: 12,
        color: "#10B981",
        fontWeight: "500",
    },
    viewToggle: {
        flexDirection: "row",
        backgroundColor: "#F3F4F6",
        borderRadius: 8,
        padding: 4,
    },
    toggleBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    toggleBtnActive: {
        backgroundColor: "#6366F1",
    },
    toggleText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#6B7280",
    },
    toggleTextActive: {
        color: "#FFFFFF",
    },
    mapContainer: {
        flex: 1,
        position: "relative",
    },
    map: {
        flex: 1,
    },
    mapLoading: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
    },
    selectedCard: {
        position: "absolute",
        bottom: 100,
        left: 20,
        right: 20,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    selectedImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
    },
    selectedInfo: {
        flex: 1,
        marginLeft: 12,
    },
    selectedName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    selectedSpecialty: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2,
    },
    selectedMeta: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        gap: 6,
    },
    selectedRating: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1F2937",
    },
    selectedFee: {
        fontSize: 14,
        fontWeight: "700",
        color: "#10B981",
        marginLeft: 8,
    },
    distanceBadge: {
        backgroundColor: "#ECFDF5",
        color: "#10B981",
        fontSize: 11,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontWeight: "600",
    },
    bookBtn: {
        backgroundColor: "#6366F1",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    bookBtnText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
    },
    listContainer: {
        padding: 20,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 16,
    },
    doctorCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        flexDirection: "row",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        position: "relative",
    },
    doctorImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
    },
    doctorInfo: {
        flex: 1,
        marginLeft: 14,
    },
    doctorName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    doctorSpecialty: {
        fontSize: 14,
        color: "#F59E0B",
        fontWeight: "500",
        marginTop: 2,
    },
    doctorMeta: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        gap: 16,
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    metaText: {
        fontSize: 13,
        color: "#6B7280",
    },
    doctorFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 10,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    locationText: {
        fontSize: 13,
        color: "#10B981",
        fontWeight: "500",
    },
    doctorFee: {
        fontSize: 16,
        fontWeight: "700",
        color: "#10B981",
    },
    availableDot: {
        position: "absolute",
        top: 16,
        right: 16,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#10B981",
    },
});
