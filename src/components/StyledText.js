import React from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';

// Custom Text component with font
export function Text({ style, ...props }) {
    return <RNText style={[{ fontFamily: 'Lora_400Regular' }, style]} {...props} />;
}

// Custom TextInput component with font
export function TextInput({ style, ...props }) {
    return <RNTextInput style={[{ fontFamily: 'Lora_400Regular' }, style]} {...props} />;
}
