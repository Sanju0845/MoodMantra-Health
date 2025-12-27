import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Modal,
    Alert,
    ActivityIndicator,
    Dimensions,
    Animated,
    PanResponder,
    Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, ChevronLeft, Sparkles, Heart, Briefcase, Home as HomeIcon, Coffee, Trash2, ChevronRight, Save, Mic, Image as ImageIcon, Play, Pause, X as CloseIcon, Laptop, Star, Lightbulb, Grid } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

import { supabase } from "../../utils/supabaseClient";

const NOTES_STORAGE_KEY = "@raskamon_notes";
const { width, height } = Dimensions.get("window");

const CARD_COLORS = [
    { primary: "#4A9B7F", secondary: "#14B8A6" },
    { primary: "#10B981", secondary: "#059669" },
    { primary: "#14B8A6", secondary: "#0D9488" },
    { primary: "#6366F1", secondary: "#4F46E5" },
    { primary: "#8B5CF6", secondary: "#7C3AED" },
];

const CATEGORIES = [
    { id: "work", icon: Laptop, label: "Work" },
    { id: "personal", icon: Star, label: "Personal" },
    { id: "ideas", icon: Lightbulb, label: "Ideas" },
    { id: "home", icon: HomeIcon, label: "Home" },
    { id: "other", icon: Grid, label: "Other" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Swipeable Note Card Component
const SwipeableNoteCard = ({ note, onEdit, onDelete, colors, CategoryIcon, isLeftColumn, isRevealed, onReveal, onHide }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const [isDeleting, setIsDeleting] = useState(false);
    const hasSwiped = useRef(false);

    // Auto-hide when another card is revealed
    useEffect(() => {
        if (!isRevealed) {
            Animated.spring(translateX, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }).start();
        }
    }, [isRevealed]);

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
            return Math.abs(gestureState.dx) > 20;
        },
        onPanResponderGrant: () => {
            hasSwiped.current = false;
            // Hide other revealed cards when starting to swipe this one
            onHide();
        },
        onPanResponderMove: (_, gestureState) => {
            if (Math.abs(gestureState.dx) > 20) {
                hasSwiped.current = true;
            }

            const maxSwipe = 80;

            if (isLeftColumn) {
                if (gestureState.dx < 0) {
                    translateX.setValue(Math.max(gestureState.dx, -maxSwipe));
                }
            } else {
                if (gestureState.dx > 0) {
                    translateX.setValue(Math.min(gestureState.dx, maxSwipe));
                }
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (!hasSwiped.current || Math.abs(gestureState.dx) < 20) {
                Animated.spring(translateX, {
                    toValue: 0,
                    tension: 50,
                    friction: 8,
                    useNativeDriver: true,
                }).start();
                return;
            }

            if (Math.abs(gestureState.dx) > 50) {
                const revealPosition = isLeftColumn ? -80 : 80;
                Animated.spring(translateX, {
                    toValue: revealPosition,
                    tension: 50,
                    friction: 8,
                    useNativeDriver: true,
                }).start();
                onReveal(note.id); // Notify parent that this card is revealed
            } else {
                Animated.spring(translateX, {
                    toValue: 0,
                    tension: 50,
                    friction: 8,
                    useNativeDriver: true,
                }).start();
                onHide();
            }
        },
    });

    const handleCardPress = () => {
        if (isRevealed) {
            // Hide trash
            Animated.spring(translateX, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }).start();
            onHide();
        } else {
            // Open edit
            onEdit();
        }
    };

    const handleDelete = () => {
        setIsDeleting(true);
        Animated.timing(translateX, {
            toValue: isLeftColumn ? -width : width,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            onDelete(note.id);
        });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    return (
        <View style={styles.swipeableContainer}>
            <View style={[styles.deleteButtonContainer, isLeftColumn ? { right: 0 } : { left: 0 }]}>
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.8}>
                    <Trash2 size={20} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <Animated.View style={[styles.noteCardWrapper, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
                <TouchableOpacity onPress={handleCardPress} activeOpacity={0.9} disabled={isDeleting}>
                    <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.noteCard}>
                        <View style={styles.noteCardHeader}>
                            <View style={[styles.categoryBadge, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                                <CategoryIcon size={14} color="#FFFFFF" />
                            </View>
                            <Text style={styles.noteDate}>{formatDate(note.updatedAt)}</Text>
                        </View>
                        <Text style={styles.noteCardTitle} numberOfLines={2}>{note.title}</Text>
                        <Text style={styles.noteCardContent} numberOfLines={4}>{note.content}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

export default function NotesScreen() {
    const insets = useSafeAreaInsets();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [noteTitle, setNoteTitle] = useState("");
    const [noteContent, setNoteContent] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("personal");
    const [saving, setSaving] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [revealedCardId, setRevealedCardId] = useState(null);

    // Audio recording state - support multiple
    const [recording, setRecording] = useState(null);
    const [audioUris, setAudioUris] = useState([]); // Changed to array
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(null); // Track which audio is playing by index

    // Image state - support multiple
    const [imageUris, setImageUris] = useState([]); // Changed to array
    const [imagePreviewUri, setImagePreviewUri] = useState(null); // For image popup
    const [showImagePreview, setShowImagePreview] = useState(false);

    // Bottom sheet animation - 2 positions only: down (under calendar) or up (fullscreen)
    const bottomSheetY = useRef(new Animated.Value(440)).current; // Start lower to show more calendar
    const MIN_Y = 100; // Fully expanded - notes take full screen
    const DEFAULT_Y = 520; // Default - more space for calendar
    const hasMoved = useRef(false);

    const [userId, setUserId] = useState(null);

    // Helpers for file upload
    const uploadFile = async (uri, bucket = 'note-attachments') => {
        try {
            if (!uri) return null;
            if (uri.startsWith('http')) return uri; // Already uploaded

            const userId = await AsyncStorage.getItem("userId");
            if (!userId) {
                throw new Error('You must be logged in to upload attachments');
            }

            // Read file as base64
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
            });

            // Generate unique filename
            const fileExt = uri.split('.').pop();
            const fileName = `${userId}/${Date.now()}.${fileExt}`;

            // Determine content type
            const contentType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg'
                : fileExt === 'png' ? 'image/png'
                    : fileExt === 'm4a' ? 'audio/m4a'
                        : 'application/octet-stream';

            // Convert base64 to array buffer for upload
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(fileName, byteArray, {
                    contentType: contentType,
                    upsert: false
                });

            if (error) {
                console.error('Upload error:', error);
                throw new Error(`Failed to upload file: ${error.message}`);
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(data.path);

            console.log('File uploaded successfully:', publicUrl);
            return publicUrl;
        } catch (error) {
            console.error("Upload error:", error);
            throw error; // Propagate error instead of silently failing
        }
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 10;
            },
            onPanResponderGrant: () => {
                hasMoved.current = false;
            },
            onPanResponderMove: (_, gestureState) => {
                if (Math.abs(gestureState.dy) > 10) {
                    hasMoved.current = true;
                }

                const newY = DEFAULT_Y + gestureState.dy;
                if (newY >= MIN_Y && newY <= DEFAULT_Y) {
                    bottomSheetY.setValue(newY);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (!hasMoved.current || Math.abs(gestureState.dy) < 10) {
                    return;
                }

                // Simple 2-position logic: up or down based on drag direction
                const draggedUp = gestureState.dy < 0;
                const targetY = draggedUp ? MIN_Y : DEFAULT_Y;

                Animated.spring(bottomSheetY, {
                    toValue: targetY,
                    tension: 50,
                    friction: 8,
                    useNativeDriver: false,
                }).start();
            },
        })
    ).current;

    useEffect(() => {
        const checkUser = async () => {
            try {
                const storedUserId = await AsyncStorage.getItem("userId");
                setUserId(storedUserId);
                if (storedUserId) {
                    await loadNotes(storedUserId);
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error("Init error:", error);
                setLoading(false);
            }
        };
        checkUser();

        // Poll for userId changes (login/logout detection)
        const interval = setInterval(async () => {
            const storedUserId = await AsyncStorage.getItem("userId");
            if (storedUserId !== userId) {
                setUserId(storedUserId);
                if (storedUserId) {
                    setLoading(true);
                    await loadNotes(storedUserId);
                } else {
                    setNotes([]);
                    setLoading(false);
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [userId]);

    const loadNotes = async (userIdParam) => {
        try {
            const targetUserId = userIdParam || userId;
            if (!targetUserId) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .eq('user_id', targetUserId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedNotes = data.map(note => ({
                id: note.id,
                title: note.title,
                content: note.content,
                category: note.category,
                colorIndex: note.color_index,
                createdAt: note.created_at,
                updatedAt: note.updated_at,
                audioUris: note.audio_uris || [],
                imageUris: note.image_uris || [],
            }));

            setNotes(formattedNotes);
        } catch (error) {
            console.error("Error loading notes:", error);
            Alert.alert("Error", "Failed to load notes");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdateNote = async () => {
        if (!noteTitle.trim() && !noteContent.trim() && audioUris.length === 0 && imageUris.length === 0) {
            Alert.alert("Missing Fields", "Please add at least title, content, or an attachment");
            return;
        }

        if (!userId) {
            Alert.alert("Error", "You must be logged in to save notes");
            return;
        }

        setSaving(true);
        try {
            // Upload files
            const uploadedAudioUris = await Promise.all(audioUris.map(uri => uploadFile(uri)));
            const uploadedImageUris = await Promise.all(imageUris.map(uri => uploadFile(uri)));

            const noteData = {
                user_id: userId,
                title: noteTitle,
                content: noteContent,
                category: selectedCategory,
                color_index: editingNote ? editingNote.colorIndex : Math.floor(Math.random() * CARD_COLORS.length),
                audio_uris: uploadedAudioUris,
                image_uris: uploadedImageUris,
                updated_at: selectedDate.toISOString(),
            };

            let error;
            if (editingNote) {
                const { error: updateError } = await supabase
                    .from('notes')
                    .update(noteData)
                    .eq('id', editingNote.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('notes')
                    .insert([noteData]);
                error = insertError;
            }

            if (error) throw error;

            await loadNotes();
            handleCloseModal();
        } catch (error) {
            console.error("Save error:", error);
            Alert.alert("Error", error.message || "Failed to save note");
        } finally {
            setSaving(false);
        }
    };

    const handleEditNote = (note) => {
        setEditingNote(note);
        setNoteTitle(note.title);
        setNoteContent(note.content);
        setSelectedCategory(note.category || "personal");
        setAudioUris(note.audioUris || []);
        setImageUris(note.imageUris || []);
        setShowModal(true);
    };

    const handleDeleteNote = async (noteId) => {
        try {
            const { error } = await supabase.from('notes').delete().eq('id', noteId);
            if (error) throw error;
            await loadNotes();
        } catch (error) {
            Alert.alert("Error", "Failed to delete note");
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingNote(null);
        setNoteTitle("");
        setNoteContent("");
        setSelectedCategory("personal");
        setAudioUris([]);
        setImageUris([]);
        if (sound) {
            sound.unloadAsync();
            setSound(null);
        }
        setIsPlaying(null);
    };

    // Audio recording functions - support multiple
    const startRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (!permission.granted) {
                Alert.alert("Permission Required", "Please allow microphone access to record audio");
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
        } catch (err) {
            Alert.alert("Error", "Failed to start recording");
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setAudioUris(prev => [...prev, uri]); // Add to array
            setRecording(null);
        } catch (err) {
            Alert.alert("Error", "Failed to stop recording");
        }
    };

    const playAudio = async (index) => {
        try {
            if (sound && isPlaying === index) {
                // Pause current
                await sound.pauseAsync();
                setIsPlaying(null);
            } else {
                // Stop any playing audio
                if (sound) {
                    await sound.unloadAsync();
                }

                // Play new audio - works with both local and remote URLs
                const audioUri = audioUris[index];
                console.log("Playing audio from:", audioUri);

                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: audioUri },
                    { shouldPlay: false }
                );

                setSound(newSound);
                await newSound.playAsync();
                setIsPlaying(index);

                newSound.setOnPlaybackStatusUpdate((status) => {
                    if (status.didJustFinish) {
                        setIsPlaying(null);
                    }
                });
            }
        } catch (err) {
            console.error("Audio play error:", err);
            Alert.alert("Error", "Failed to play audio. Make sure the file is accessible.");
        }
    };

    const deleteAudio = (index) => {
        setAudioUris(prev => prev.filter((_, i) => i !== index));
        if (sound && isPlaying === index) {
            sound.unloadAsync();
            setSound(null);
            setIsPlaying(null);
        }
    };

    // Image picker function - support multiple
    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Permission Required", "Please allow photo library access");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], // Fixed: Use array instead of deprecated MediaTypeOptions
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUris(prev => [...prev, result.assets[0].uri]); // Add to array
        }
    };

    const deleteImage = (index) => {
        setImageUris(prev => prev.filter((_, i) => i !== index));
    };
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

        const days = [];
        for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
        return days;
    };

    const getNotesForDate = (date) => {
        if (!date) return 0;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        return notes.filter((note) => {
            const noteDate = new Date(note.updatedAt);
            const noteYear = noteDate.getFullYear();
            const noteMonth = String(noteDate.getMonth() + 1).padStart(2, "0");
            const noteDay = String(noteDate.getDate()).padStart(2, "0");
            const noteDateStr = `${noteYear}-${noteMonth}-${noteDay}`;
            return noteDateStr === dateStr;
        }).length;
    };

    const changeMonth = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    const filteredNotes = notes.filter((note) => {
        const noteDate = new Date(note.updatedAt);
        const noteYear = noteDate.getFullYear();
        const noteMonth = String(noteDate.getMonth() + 1).padStart(2, "0");
        const noteDay = String(noteDate.getDate()).padStart(2, "0");
        const noteDateStr = `${noteYear}-${noteMonth}-${noteDay}`;

        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const selectedDay = String(selectedDate.getDate()).padStart(2, "0");
        const selectedDateStr = `${selectedYear}-${selectedMonth}-${selectedDay}`;

        return noteDateStr === selectedDateStr;
    });

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A9B7F" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View>
                    <Text style={styles.headerTitle}>Notes</Text>
                    <Text style={styles.headerSubtitle}>
                        {filteredNotes.length} {filteredNotes.length === 1 ? "NOTE" : "NOTES"}
                    </Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)} activeOpacity={0.8}>
                    <LinearGradient colors={["#4A9B7F", "#14B8A6"]} style={styles.addButtonGradient}>
                        <Plus size={24} color="#FFFFFF" strokeWidth={3} />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Calendar Section */}
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.calendarContainer}>
                    <View style={styles.calendarHeader}>
                        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthButton}>
                            <ChevronLeft size={20} color="#4A9B7F" />
                        </TouchableOpacity>
                        <Text style={styles.monthYear}>
                            {MONTHS[currentDate.getMonth()]}, {currentDate.getFullYear()}
                        </Text>
                        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthButton}>
                            <ChevronRight size={20} color="#4A9B7F" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.daysHeader}>
                        {DAYS.map((day) => (
                            <Text key={day} style={styles.dayLabel}>{day}</Text>
                        ))}
                    </View>

                    <View style={styles.daysGrid}>
                        {getDaysInMonth(currentDate).map((day, index) => {
                            if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;

                            const isToday = day.toDateString() === new Date().toDateString();
                            const isSelected = day.toDateString() === selectedDate.toDateString();
                            const notesCount = getNotesForDate(day);
                            const hasNotes = notesCount > 0;

                            return (
                                <TouchableOpacity
                                    key={day.toISOString()}
                                    style={styles.dayCell}
                                    onPress={() => setSelectedDate(day)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.dayCircle, isToday && styles.dayCircleToday, isSelected && styles.dayCircleSelected]}>
                                        <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected, isToday && !isSelected && styles.dayNumberToday]}>
                                            {day.getDate()}
                                        </Text>
                                    </View>
                                    {hasNotes && (
                                        <View style={styles.noteIndicator}>
                                            <Text style={styles.noteIndicatorText}>{notesCount}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            {/* Draggable Notes Section */}
            <Animated.View style={[styles.notesSheet, { top: bottomSheetY }]}>
                <View {...panResponder.panHandlers} style={styles.dragHandle}>
                    <View style={styles.dragBar} />
                </View>

                <View style={styles.notesHeader}>
                    <Text style={styles.notesSectionTitle}>
                        {selectedDate.toDateString() === new Date().toDateString()
                            ? "Today's Notes"
                            : `Notes for ${selectedDate.toLocaleDateString([], { month: "long", day: "numeric" })}`}
                    </Text>
                </View>

                <ScrollView
                    style={styles.notesScroll}
                    contentContainerStyle={[styles.notesContent, { paddingBottom: insets.bottom + 100 }]}
                    showsVerticalScrollIndicator={false}
                    onScroll={() => setRevealedCardId(null)} // Hide trash when scrolling
                    scrollEventThrottle={16}
                >
                    {filteredNotes.length === 0 ? (
                        <View style={styles.emptyNotes}>
                            <Text style={styles.emptyNotesText}>No notes for this day</Text>
                            <TouchableOpacity style={styles.addNoteButton} onPress={() => setShowModal(true)}>
                                <Text style={styles.addNoteButtonText}>+ Add Note</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.notesGrid}>
                            {filteredNotes.map((note, index) => {
                                const colors = CARD_COLORS[note.colorIndex || 0];
                                const CategoryIcon = CATEGORIES.find((c) => c.id === note.category)?.icon || Coffee;
                                const isLeftColumn = index % 2 === 0;
                                return (
                                    <SwipeableNoteCard
                                        key={note.id}
                                        note={note}
                                        onEdit={() => handleEditNote(note)}
                                        onDelete={handleDeleteNote}
                                        colors={colors}
                                        CategoryIcon={CategoryIcon}
                                        isLeftColumn={isLeftColumn}
                                        isRevealed={revealedCardId === note.id}
                                        onReveal={(id) => setRevealedCardId(id)}
                                        onHide={() => setRevealedCardId(null)}
                                    />
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            </Animated.View>

            {/* Create/Edit Note Modal */}
            <Modal visible={showModal} animationType="slide" transparent={false} onRequestClose={handleCloseModal}>
                <LinearGradient colors={["#4A9B7F", "#14B8A6"]} style={styles.modalGradient}>
                    <StatusBar style="light" />

                    <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }]}>
                        <TouchableOpacity onPress={handleCloseModal} style={styles.backButton}>
                            <ChevronLeft size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text style={styles.modalHeaderTitle}>{editingNote ? "Edit Note" : "Create Note"}</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.modalTitleContainer}>
                        <TextInput
                            style={styles.modalTitleInput}
                            placeholder="Note title..."
                            placeholderTextColor="rgba(255,255,255,0.6)"
                            value={noteTitle}
                            onChangeText={setNoteTitle}
                            maxLength={100}
                        />
                    </View>

                    <View style={styles.modalWhiteContent}>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 100 }}
                        >
                            <View style={styles.categorySection}>
                                <Text style={styles.categoryLabel}>Choose Category</Text>
                                <View style={styles.categoriesRow}>
                                    {CATEGORIES.map((cat) => {
                                        const Icon = cat.icon;
                                        const isSelected = selectedCategory === cat.id;
                                        return (
                                            <TouchableOpacity
                                                key={cat.id}
                                                style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
                                                onPress={() => setSelectedCategory(cat.id)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={[styles.categoryIconContainer, isSelected && styles.categoryIconSelected]}>
                                                    <Icon size={22} color={isSelected ? "#FFFFFF" : "#4A9B7F"} strokeWidth={2} />
                                                </View>
                                                <Text style={[styles.categoryItemLabel, isSelected && styles.categoryItemLabelSelected]}>
                                                    {cat.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Attachment buttons */}
                            <View style={styles.attachmentButtons}>
                                <TouchableOpacity
                                    style={styles.attachButton}
                                    onPress={recording ? stopRecording : startRecording}
                                    activeOpacity={0.7}
                                >
                                    <Mic size={20} color={recording ? "#EF4444" : "#4A9B7F"} />
                                    <Text style={[styles.attachButtonText, recording && { color: "#EF4444" }]}>
                                        {recording ? "Stop Recording" : "Record Audio"}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.attachButton} onPress={pickImage} activeOpacity={0.7}>
                                    <ImageIcon size={20} color="#4A9B7F" />
                                    <Text style={styles.attachButtonText}>Add Image</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Audio player */}
                            {/* Audio gallery - horizontal scroll */}
                            {audioUris.length > 0 && (
                                <View style={styles.attachmentSection}>
                                    <Text style={styles.attachmentSectionTitle}>Audio Notes ({audioUris.length})</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentGallery}>
                                        {audioUris.map((uri, index) => (
                                            <View key={index} style={styles.audioCard}>
                                                <TouchableOpacity
                                                    style={styles.audioPlayButton}
                                                    onPress={() => playAudio(index)}
                                                    activeOpacity={0.7}
                                                >
                                                    {isPlaying === index ?
                                                        <Pause size={18} color="#FFFFFF" /> :
                                                        <Play size={18} color="#FFFFFF" />
                                                    }
                                                </TouchableOpacity>
                                                <Text style={styles.audioCardText}>Audio {index + 1}</Text>
                                                <TouchableOpacity onPress={() => deleteAudio(index)} activeOpacity={0.7}>
                                                    <CloseIcon size={18} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Image gallery - horizontal scroll */}
                            {imageUris.length > 0 && (
                                <View style={styles.attachmentSection}>
                                    <Text style={styles.attachmentSectionTitle}>Images ({imageUris.length})</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentGallery}>
                                        {imageUris.map((uri, index) => (
                                            <View key={index} style={styles.imageThumbnail}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setImagePreviewUri(uri);
                                                        setShowImagePreview(true);
                                                    }}
                                                    activeOpacity={0.8}
                                                >
                                                    <Image source={{ uri }} style={styles.thumbnailImage} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.deleteImageButton}
                                                    onPress={() => deleteImage(index)}
                                                    activeOpacity={0.7}
                                                >
                                                    <CloseIcon size={16} color="#FFFFFF" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                            {/* Content input */}
                            <View style={styles.contentInputContainer}>
                                <TextInput
                                    style={styles.contentInput}
                                    placeholder="Start writing your note..."
                                    placeholderTextColor="#9CA3AF"
                                    value={noteContent}
                                    onChangeText={setNoteContent}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.saveButtonContainer}>
                            <TouchableOpacity onPress={handleCreateOrUpdateNote} style={styles.saveButtonWrapper} disabled={saving} activeOpacity={0.8}>
                                <LinearGradient colors={["#4A9B7F", "#14B8A6"]} style={styles.saveButtonGradient}>
                                    {saving ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <Save size={20} color="#FFFFFF" />
                                            <Text style={styles.saveButtonText}>Save Note</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>
            </Modal>

            {/* Image Preview Modal */}
            <Modal
                visible={showImagePreview}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowImagePreview(false)}
            >
                <View style={styles.imagePreviewContainer}>
                    <TouchableOpacity
                        style={styles.imagePreviewDim}
                        activeOpacity={1}
                        onPress={() => setShowImagePreview(false)}
                    >
                        <StatusBar style="light" />
                    </TouchableOpacity>

                    <View style={styles.imagePreviewContent}>
                        <TouchableOpacity
                            style={styles.imagePreviewClose}
                            onPress={() => setShowImagePreview(false)}
                            activeOpacity={0.8}
                        >
                            <CloseIcon size={28} color="#FFFFFF" />
                        </TouchableOpacity>

                        {imagePreviewUri && (
                            <Image
                                source={{ uri: imagePreviewUri }}
                                style={styles.imagePreviewImage}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFB" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFB" },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: "#FFFFFF",
    },
    headerTitle: { fontSize: 28, fontWeight: "800", color: "#1F2937" },
    headerSubtitle: { fontSize: 11, fontWeight: "600", color: "#9CA3AF", marginTop: 4, letterSpacing: 0.5 },
    addButton: { borderRadius: 28, overflow: "hidden", shadowColor: "#4A9B7F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    addButtonGradient: { width: 56, height: 56, justifyContent: "center", alignItems: "center" },
    calendarContainer: { backgroundColor: "#FFFFFF", padding: 16, marginBottom: 8 },
    calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    monthButton: { padding: 8 },
    monthYear: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
    daysHeader: { flexDirection: "row", justifyContent: "space-around", marginBottom: 12 },
    dayLabel: { width: (width - 32) / 7, textAlign: "center", fontSize: 11, fontWeight: "600", color: "#9CA3AF" },
    daysGrid: { flexDirection: "row", flexWrap: "wrap" },
    dayCell: { width: (width - 32) / 7, height: 48, alignItems: "center", justifyContent: "center", position: "relative" },
    dayCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden", // Ensure circle stays round
    },
    dayCircleToday: { backgroundColor: "#D1FAE5" },
    dayCircleSelected: { backgroundColor: "#4A9B7F" },
    dayNumber: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
    dayNumberToday: { color: "#4A9B7F", fontWeight: "700" },
    dayNumberSelected: { color: "#FFFFFF", fontWeight: "700" },
    noteIndicator: {
        position: "absolute",
        top: 2,
        right: 8,
        backgroundColor: "#14B8A6",
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
    },
    noteIndicatorText: { fontSize: 9, fontWeight: "700", color: "#FFFFFF" },
    notesSheet: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    dragHandle: { paddingTop: 12, paddingBottom: 8, alignItems: "center" },
    dragBar: { width: 40, height: 4, backgroundColor: "#4A9B7F", borderRadius: 2 },
    notesHeader: { paddingHorizontal: 20, paddingBottom: 12 },
    notesSectionTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
    notesScroll: { flex: 1 },
    notesContent: { padding: 20 },
    emptyNotes: { alignItems: "center", paddingVertical: 60 },
    emptyNotesText: { fontSize: 15, color: "#9CA3AF", marginBottom: 16 },
    addNoteButton: { backgroundColor: "#D1FAE5", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
    addNoteButtonText: { fontSize: 14, fontWeight: "600", color: "#4A9B7F" },
    notesGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    swipeableContainer: { width: (width - 52) / 2, marginBottom: 16, position: "relative" },
    deleteButtonContainer: { position: "absolute", right: 0, top: 0, bottom: 0, width: 80, justifyContent: "center", alignItems: "center" },
    deleteButton: { backgroundColor: "#EF4444", width: 64, height: "100%", borderRadius: 20, justifyContent: "center", alignItems: "center" },
    noteCardWrapper: { width: "100%" },
    noteCard: { borderRadius: 20, padding: 16, minHeight: 160, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
    noteCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    categoryBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
    noteDate: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.9)" },
    noteCardTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", marginBottom: 8, lineHeight: 22 },
    noteCardContent: { fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 18 },
    modalGradient: { flex: 1 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
    modalHeaderTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
    modalTitleContainer: { paddingHorizontal: 20, paddingVertical: 20 },
    modalTitleInput: { fontSize: 24, fontWeight: "700", color: "#FFFFFF", paddingVertical: 8 },
    modalWhiteContent: { flex: 1, backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24 },
    categorySection: {
        paddingHorizontal: 16,
        marginBottom: 20,
        backgroundColor: "#F9FAFB",
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 20,
    },
    categoryLabel: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 16,
        letterSpacing: 0.3,
    },
    categoriesRow: {
        flexDirection: "row",
        justifyContent: "space-between", // Fuller width
        alignItems: "center",
    },
    categoryItem: {
        alignItems: "center",
        flex: 1, // Take equal space
    },
    categoryItemSelected: {
        transform: [{ scale: 1.05 }], // Slight scale on selection
    },
    categoryIconContainer: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: "#D1FAE5",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
        shadowColor: "#4A9B7F",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    categoryIconSelected: {
        backgroundColor: "#4A9B7F",
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    categoryItemLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#6B7280",
        textAlign: "center",
    },
    categoryItemLabelSelected: {
        color: "#4A9B7F",
        fontWeight: "700",
    },
    contentInputContainer: {
        paddingHorizontal: 20,
        minHeight: 200,
    },
    contentInput: {
        fontSize: 15,
        color: "#1F2937",
        lineHeight: 24,
        minHeight: 200,
        paddingTop: 0,
    },
    saveButtonContainer: { padding: 20, paddingBottom: 32 },
    saveButtonWrapper: { borderRadius: 20, overflow: "hidden", shadowColor: "#4A9B7F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    saveButtonGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
    saveButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
    // Audio and Image styles - updated for multiple
    attachmentButtons: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    attachButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: "#D1FAE5",
        borderRadius: 16,
    },
    attachButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#4A9B7F",
    },
    attachmentSection: {
        marginBottom: 16,
    },
    attachmentSectionTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 8,
        paddingHorizontal: 20,
    },
    attachmentGallery: {
        paddingLeft: 20,
    },
    audioCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginRight: 12,
        backgroundColor: "#F3F4F6",
        borderRadius: 12,
        width: 160,
    },
    audioPlayButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#4A9B7F",
        justifyContent: "center",
        alignItems: "center",
    },
    audioCardText: {
        flex: 1,
        fontSize: 13,
        fontWeight: "600",
        color: "#1F2937",
    },
    imageThumbnail: {
        position: "relative",
        marginRight: 12,
        borderRadius: 12,
        overflow: "hidden",
    },
    thumbnailImage: {
        width: 120,
        height: 120,
        borderRadius: 12,
    },
    deleteImageButton: {
        position: "absolute",
        top: 6,
        right: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "rgba(239, 68, 68, 0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    imagePreviewContainer: {
        flex: 1,
        backgroundColor: "transparent",
    },
    imagePreviewDim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
    },
    imagePreviewContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    imagePreviewClose: {
        position: "absolute",
        top: 50,
        right: 20,
        zIndex: 10,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    imagePreviewImage: {
        width: "100%",
        height: "100%",
    },
});
