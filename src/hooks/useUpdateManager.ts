import { useEffect, useState } from 'react';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

/**
 * UpdateManager - Handles OTA updates automatically
 * - Checks for updates on app launch
 * - Downloads and applies updates in background
 * - Shows update notification to user
 */
export function useUpdateManager() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        // Only check for updates in production builds (not in dev mode)
        if (__DEV__ || !Updates.isEnabled) {
            return;
        }

        checkForUpdates();
    }, []);

    const checkForUpdates = async () => {
        try {
            console.log('🔍 Checking for updates...');

            const update = await Updates.checkForUpdateAsync();

            if (update.isAvailable) {
                console.log('📦 Update available! Downloading...');
                setUpdateAvailable(true);
                setIsUpdating(true);

                // Show alert for debugging
                if (Platform.OS !== 'web') {
                    const { Alert } = require('react-native');
                    Alert.alert('OTA Update', 'Downloading update...');
                }

                await Updates.fetchUpdateAsync();

                console.log('✅ Update downloaded! Reloading app...');

                // Show alert before reload
                if (Platform.OS !== 'web') {
                    const { Alert } = require('react-native');
                    Alert.alert('OTA Update', 'Update ready! App will restart...', [
                        { text: 'OK', onPress: () => Updates.reloadAsync() }
                    ]);
                } else {
                    await Updates.reloadAsync();
                }
            } else {
                console.log('✅ App is up to date!');

                // Debug alert
                if (Platform.OS !== 'web') {
                    const { Alert } = require('react-native');
                    Alert.alert('OTA Check', 'No updates available. App is up to date!');
                }
            }
        } catch (error) {
            console.error('❌ Error checking for updates:', error);

            // Show error alert
            if (Platform.OS !== 'web') {
                const { Alert } = require('react-native');
                Alert.alert('OTA Error', `Update check failed: ${error.message}`);
            }

            // Don't crash the app if update check fails
            setIsUpdating(false);
        }
    };

    return {
        updateAvailable,
        isUpdating,
        checkForUpdates,
    };
}

/**
 * Get current update info for debugging
 */
export const getUpdateInfo = () => {
    if (!Updates.isEnabled) {
        return {
            enabled: false,
            mode: 'development',
        };
    }

    return {
        enabled: true,
        updateId: Updates.updateId,
        channel: Updates.channel,
        runtimeVersion: Updates.runtimeVersion,
        createdAt: Updates.createdAt,
    };
};
