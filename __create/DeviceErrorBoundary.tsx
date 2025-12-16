import React, { type ReactNode, useCallback, useEffect, useState } from 'react';
import { SharedErrorBoundary, Button } from './SharedErrorBoundary';
import * as Updates from 'expo-updates';
import { SplashScreen } from 'expo-router/build/exports';
import { DevSettings, LogBox, Platform, View, Text, Image } from 'react-native';
import { serializeError } from 'serialize-error';
import { reportErrorToRemote } from './report-error-to-remote';

type ErrorBoundaryState = { hasError: boolean; error: unknown | null; sentLogs: boolean };

const DeviceErrorBoundary = ({
  sentLogs,
}: {
  sentLogs: boolean;
}) => {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => { });
  }, []);
  const handleReload = useCallback(async () => {
    if (Platform.OS === 'web') {
      window.location.reload();
      return;
    }

    Updates.reloadAsync().catch((error) => {
      // no-op
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* Custom Error UI */}
      <View style={{ marginBottom: 20, width: 200, height: 200, borderRadius: 100, overflow: 'hidden' }}>
        <Image
          source={{ uri: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZ4bm54bnZ4bnZ4bnZ4bnZ4bnZ4bnZ4bnZ4bnZ4bnZ4bSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKr3nzbh5WgCFxe/giphy.gif" }}
          style={{ width: '100%', height: '100%' }}
        />
      </View>

      <Text style={{ fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 30, color: '#1F2937' }}>
        Maintain your health we will mantain our app and fix this error
      </Text>

      <Button color="primary" onPress={handleReload}>
        Go to Homepage
      </Button>
    </View>
  );
};

export class DeviceErrorBoundaryWrapper extends React.Component<
  {
    children: ReactNode;
  },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null, sentLogs: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error, sentLogs: false };
  }
  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    this.setState({ error });
    reportErrorToRemote({ error })
      .then(({ success, error: fetchError }) => {
        this.setState({ hasError: true, sentLogs: success });
      })
      .catch((reportError) => {
        this.setState({ hasError: true, sentLogs: false });
      });
  }

  render() {
    if (this.state.hasError) {
      return <DeviceErrorBoundary sentLogs={this.state.sentLogs} />;
    }
    return this.props.children;
  }
}
