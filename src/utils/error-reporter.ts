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
  try {
    const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
    const errorUtils = globalObj?.ErrorUtils;
    if (!errorUtils || typeof errorUtils.getGlobalHandler !== 'function') {
      return;
    }
    const originalHandler = errorUtils.getGlobalHandler();

    errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      try {
        reportError({
          title: `[Mobile-${Platform.OS}] ${isFatal ? 'Fatal' : 'Non-fatal'} Error - ${error?.message || 'Unknown'}`,
          description: error?.message,
          priority: isFatal ? 'Highest' : 'High',
          labels: [`mobile-${Platform.OS}`, isFatal ? 'fatal' : 'non-fatal'],
          stacktrace: error?.stack,
        });
      } catch {
        // ignore
      }

      // Call original handler if it exists
      if (typeof originalHandler === 'function') {
        originalHandler(error, isFatal);
      }
    });
  } catch {
    // Startup guard — never crash during error handler initialization
  }
}
