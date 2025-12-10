import { useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, useAuthModal } from './store';

/**
 * Validate token format (basic JWT validation)
 */
const validateToken = (token) => {
    if (!token) return false;

    // Basic JWT format validation (3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    return true;
};

/**
 * This hook provides authentication functionality.
 */
export const useAuth = () => {
    const { isReady, token, userData, setToken, setUserData, setReady, clearAuth } = useAuthStore();
    const { isOpen, close, open } = useAuthModal();

    const initiate = useCallback(async () => {
        try {
            // Try to get token from AsyncStorage
            const storedToken = await AsyncStorage.getItem('token');

            if (storedToken && validateToken(storedToken)) {
                useAuthStore.setState({
                    token: storedToken,
                    isReady: true,
                });
            } else {
                // Invalid or no token
                if (storedToken) {
                    await AsyncStorage.removeItem('token');
                }
                useAuthStore.setState({
                    token: null,
                    isReady: true,
                });
            }
        } catch (error) {
            console.error('[useAuth] Error initializing auth:', error);
            useAuthStore.setState({
                token: null,
                isReady: true,
            });
        }
    }, []);

    const signIn = useCallback(() => {
        open({ mode: 'signin' });
    }, [open]);

    const signUp = useCallback(() => {
        open({ mode: 'signup' });
    }, [open]);

    const signOut = useCallback(async () => {
        await clearAuth();
        close();
    }, [close, clearAuth]);

    return {
        isReady,
        isAuthenticated: isReady ? !!token : null,
        token,
        userData,
        signIn,
        signOut,
        signUp,
        setToken,
        setUserData,
        initiate,
    };
};

/**
 * This hook will automatically open the authentication modal if the user is not authenticated.
 */
export const useRequireAuth = (options) => {
    const { isAuthenticated, isReady } = useAuth();
    const { open } = useAuthModal();

    useEffect(() => {
        if (!isAuthenticated && isReady) {
            open({ mode: options?.mode });
        }
    }, [isAuthenticated, open, options?.mode, isReady]);
};

export default useAuth;
