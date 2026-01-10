import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';

// Apply Caveat font to all text
const styles = StyleSheet.create({
    text: {
        fontFamily: 'Caveat_400Regular',
    },
});

export function Text(props) {
    return <RNText {...props} style={[styles.text, props.style]} />;
}
