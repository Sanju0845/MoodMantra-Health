import React from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';

// Custom Text component with default font
export const Text = (props) => {
    return (
        <RNText
            {...props}
            style={[
                {
                    fontFamily: 'Caveat_700Bold',
                    textTransform: 'uppercase',
                    fontWeight: '700',
                },
                props.style,
            ]}
        />
    );
};

// Custom TextInput component with default font
export const TextInput = (props) => {
    return (
        <RNTextInput
            {...props}
            style={[
                {
                    fontFamily: 'Caveat_700Bold',
                    textTransform: 'uppercase',
                    fontWeight: '700',
                },
                props.style,
            ]}
        />
    );
};

export default Text;
