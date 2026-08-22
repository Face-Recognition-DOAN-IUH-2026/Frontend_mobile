import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { reportError } from '../utils/error-reporter';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    reportError({
      title: `[Mobile] Render Error: ${error.message}`,
      description: error.message,
      priority: 'High',
      stacktrace: errorInfo.componentStack || error.stack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Da xay ra loi</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'Ung dung gap loi. Vui long thu lai.'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Thu lai</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0D1117',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E6EDF3',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#8B949E',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1A73E8',
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
