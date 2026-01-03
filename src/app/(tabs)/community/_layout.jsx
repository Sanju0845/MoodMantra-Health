import { Stack } from 'expo-router';
import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';

export default function CommunityLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_right',
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                fullScreenGestureEnabled: true,
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
                    animation: 'slide_from_right',
                    presentation: 'card',
                }}
            />
        </Stack>
    );
}
