import { useRef } from "react";
import { TouchableOpacity, Animated } from "react-native";

/**
 * AnimatedButton - A TouchableOpacity with smooth scale animation on press
 * Uses React Native's built-in Animated API (no extra packages needed)
 */
export default function AnimatedButton({
    children,
    onPress,
    style,
    scale = 0.95,
    activeOpacity = 1,
    disabled = false,
    ...props
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: scale,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    return (
        <Animated.View
            style={[
                style,
                {
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={activeOpacity}
                disabled={disabled}
                style={{ alignItems: "center" }}
                {...props}
            >
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
}

/**
 * AnimatedCard - A pressable card with subtle scale and shadow animation
 */
export function AnimatedCard({
    children,
    onPress,
    style,
    scale = 0.98,
    ...props
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: scale,
            useNativeDriver: true,
            speed: 50,
            bounciness: 2,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 2,
        }).start();
    };

    return (
        <Animated.View
            style={[
                style,
                {
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                {...props}
            >
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
}

/**
 * AnimatedIconButton - Small icon buttons with bounce effect
 */
export function AnimatedIconButton({
    children,
    onPress,
    style,
    ...props
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.timing(scaleAnim, {
            toValue: 0.85,
            duration: 50,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 10,
        }).start();
    };

    return (
        <Animated.View
            style={[
                style,
                {
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                {...props}
            >
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
}
