import { Platform } from 'react-native';
import { API_BASE_NO_PATH } from '../config/api';

interface ReportErrorParams {
  title: string;
  description?: string;
  priority?: 'Highest' | 'High' | 'Medium' | 'Low';
  labels?: string[];
  service?: string;
  endpoint?: string;
  method?: string;
  stacktrace?: string;
  requestBody?: string;
}

export async function reportError(params: ReportErrorParams): Promise<void> {
  try {
    await fetch(`${API_BASE_NO_PATH}/errors/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        service: params.service || `mobile-${Platform.OS}`,
        labels: [...(params.labels || []), `mobile-${Platform.OS}`],
      }),
    });
  } catch {
    // Silent fail — error reporting should never break the app
  }
}

// Global error handler for unhandled errors
export function setupGlobalErrorHandlers() {
  if (typeof ErrorUtils === 'undefined' || !ErrorUtils.getGlobalHandler) {
    return;
  }
  const originalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    reportError({
      title: `[Mobile-${Platform.OS}] ${isFatal ? 'Fatal' : 'Non-fatal'} Error - ${error.message}`,
      description: error.message,
      priority: isFatal ? 'Highest' : 'High',
      labels: [`mobile-${Platform.OS}`, isFatal ? 'fatal' : 'non-fatal'],
      stacktrace: error.stack,
    });

    // Call original handler if it exists
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}
