import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text/Text';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error.name);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.screen}>
          <View style={styles.content}>
            <Text accessibilityRole="header" variant="heading">
              Algo no ha salido bien
            </Text>
            <Text style={styles.message} tone="secondary" variant="body">
              Cierra y vuelve a abrir la aplicación.
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  message: {
    marginTop: spacing.sm,
  },
});
