import { Stack } from "expo-router";

export default function TeenAssessmentLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="module" />
            <Stack.Screen name="report" />
        </Stack>
    );
}
