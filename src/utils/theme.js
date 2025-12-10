// Theme colors matching the Figma Mental Health App design
export const colors = {
    // Primary
    primary: '#7C3AED',
    primaryLight: '#A78BFA',
    primaryDark: '#5B21B6',

    // Secondary
    secondary: '#10B981',
    secondaryLight: '#34D399',

    // Background
    background: '#F5F5F5',
    cardBackground: '#FFFFFF',

    // Text
    textDark: '#1F2937',
    textMedium: '#4B5563',
    textLight: '#9CA3AF',
    textWhite: '#FFFFFF',

    // Status colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // Mood colors
    moodHappy: '#10B981',
    moodNeutral: '#F59E0B',
    moodSad: '#3B82F6',
    moodAnxious: '#EF4444',
    moodCalm: '#8B5CF6',

    // Border
    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
};

export const fontSize = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

export const fontWeight = {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
};

export const shadow = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
};

export default {
    colors,
    spacing,
    borderRadius,
    fontSize,
    fontWeight,
    shadow,
};
