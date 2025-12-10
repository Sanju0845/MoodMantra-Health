import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Token key for storage
export const authKey = 'moodmantra-token';

/**
 * This store manages the authentication state of the application.
 */
export const useAuthStore = create((set, get) => ({
    isReady: false,
    token: null,
    userData: null,

    setToken: async (token) => {
        try {
            if (token) {
                await AsyncStorage.setItem('token', token);
            } else {
                await AsyncStorage.removeItem('token');
                await AsyncStorage.removeItem('userId');
            }
            set({ token });
        } catch (error) {
            console.error('[AuthStore] Error setting token:', error);
            set({ token });
        }
    },

    setUserData: (userData) => {
        set({ userData });
    },

    setReady: (isReady) => {
        set({ isReady });
    },

    clearAuth: async () => {
        try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('userId');
        } catch (error) {
            console.error('[AuthStore] Error clearing auth:', error);
        }
        set({ token: null, userData: null });
    },
}));

/**
 * This store manages the state of the authentication modal.
 */
export const useAuthModal = create((set) => ({
    isOpen: false,
    mode: 'signup',
    open: (options) => set({ isOpen: true, mode: options?.mode || 'signup' }),
    close: () => set({ isOpen: false }),
}));
