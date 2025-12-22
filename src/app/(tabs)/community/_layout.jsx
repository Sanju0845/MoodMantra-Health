import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function CommunityLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'none',
                ...(Platform.OS === 'ios' && {
                    gestureEnabled: true,
                    gestureDirection: 'horizontal',
                }),
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: 'Community Hub',
                }}
            />
            <Stack.Screen
                name="chat/[id]"
                options={{
                    title: 'Chat',
                    animation: 'none',
                    presentation: 'card',
                }}
            />
        </Stack>
    );
}
