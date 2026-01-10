// Font configuration for the app
export const fonts = {
    regular: 'Caveat_400Regular',
    medium: 'Caveat_500Medium',
    semiBold: 'Caveat_600SemiBold',
    bold: 'Caveat_700Bold',
};

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

console.log('[FontConfig] ✏️ Caveat handwritten font utilities loaded');
