import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';

export const Text = ({ style, ...props }) => {
    return <RNText style={[styles.defaultText, style]} {...props} />;
};

const styles = StyleSheet.create({
    defaultText: {
        fontFamily: 'Lora_400Regular',
    },
});
