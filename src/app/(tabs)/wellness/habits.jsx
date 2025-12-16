import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function ComingSoon() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <ArrowLeft color="#000" size={24} onPress={() => router.back()} />
                <Text style={styles.title}>Feature Coming Soon</Text>
            </View>
            <View style={styles.content}>
                <Text style={styles.message}>This wellness feature is currently under development.</Text>
                <Text style={styles.subMessage}>Stay tuned for future updates!</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 20,
        gap: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    message: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 8,
    },
    subMessage: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
    },
});
