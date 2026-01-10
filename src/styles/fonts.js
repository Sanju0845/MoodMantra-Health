import { StyleSheet } from 'react-native';

// Create global text styles with Caveat handwritten font
export const fonts = {
    regular: 'Caveat_400Regular',
    medium: 'Caveat_500Medium',
    semiBold: 'Caveat_600SemiBold',
    bold: 'Caveat_700Bold',
};

// Global text styles - import and use these in your style objects
export const textStyles = StyleSheet.create({
    regular: {
        fontFamily: fonts.regular,
    },
    medium: {
        fontFamily: fonts.medium,
    },
    semiBold: {
        fontFamily: fonts.semiBold,
    },
    bold: {
        fontFamily: fonts.bold,
    },
});

// Helper to get font family by weight
export const getFontFamily = (weight = 400) => {
    switch (weight) {
        case 500:
            return fonts.medium;
        case 600:
            return fonts.semiBold;
        case 700:
        case 'bold':
            return fonts.bold;
        default:
            return fonts.regular;
    }
};
