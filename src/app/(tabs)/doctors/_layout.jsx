import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function DoctorsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                contentStyle: { backgroundColor: '#FFFFFF' },
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="[id]"
                options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    presentation: 'card',
                }}
            />
            <Stack.Screen
                name="payment"
                options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                }}
            />
        </Stack>
    );
}
