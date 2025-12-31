import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Important: This allows the browser to close properly after auth
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Configuration
const GOOGLE_OAUTH_CONFIG = {
    clientId: '912510032049-9k9t1m6illvcguil2je7il9oc8jc0f24.apps.googleusercontent.com',
    redirectUri: AuthSession.makeRedirectUri({
        scheme: 'raskamon',
        path: 'auth'
    }),
    scopes: ['profile', 'email'],
};

// Debug: Log the redirect URI
console.log('🔗 Google OAuth Redirect URI:', GOOGLE_OAUTH_CONFIG.redirectUri);

/**
 * Initiate Google OAuth flow
 * @returns {Promise<Object>} Authentication response with user data and token
 */
export const signInWithGoogle = async () => {
    try {
        const discovery = {
            authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenEndpoint: 'https://oauth2.googleapis.com/token',
        };

        const authRequestOptions = {
            responseType: AuthSession.ResponseType.Code,
            clientId: GOOGLE_OAUTH_CONFIG.clientId,
            redirectUri: GOOGLE_OAUTH_CONFIG.redirectUri,
            scopes: GOOGLE_OAUTH_CONFIG.scopes,
            usePKCE: true,
        };

        const authRequest = new AuthSession.AuthRequest(authRequestOptions);

        const result = await authRequest.promptAsync(discovery);

        if (result.type === 'success') {
            const { code } = result.params;

            // Send the authorization code to your backend
            const response = await api.googleAuth(code, GOOGLE_OAUTH_CONFIG.redirectUri);

            if (response.success && response.token) {
                // Store authentication data
                await AsyncStorage.setItem('token', response.token);
                await AsyncStorage.setItem('userType', 'user');

                if (response.userData) {
                    await AsyncStorage.setItem('userId', response.userData._id);
                    await AsyncStorage.setItem('userData', JSON.stringify(response.userData));
                }

                return {
                    success: true,
                    token: response.token,
                    userData: response.userData,
                };
            } else {
                throw new Error(response.message || 'Google authentication failed');
            }
        } else if (result.type === 'cancel') {
            return {
                success: false,
                message: 'Authentication cancelled',
                cancelled: true
            };
        } else {
            throw new Error('Authentication failed');
        }
    } catch (error) {
        console.error('[GoogleAuth] Error:', error);
        return {
            success: false,
            message: error.message || 'Google sign-in failed',
            error
        };
    }
};

/**
 * Get Google OAuth redirect URI for debugging
 */
export const getGoogleRedirectUri = () => {
    return GOOGLE_OAUTH_CONFIG.redirectUri;
};
