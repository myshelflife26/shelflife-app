/**
 * Safe error logging utility to prevent "Cannot convert object to primitive value" errors
 */
export const safeErrorLog = (message: string, error: any): void => {
  if (error instanceof Error) {
    console.error(message, error.message);
  } else if (typeof error === 'string') {
    console.error(message, error);
  } else if (error && typeof error === 'object') {
    try {
      console.error(message, JSON.stringify(error, null, 2));
    } catch {
      console.error(message, '[Object could not be serialized]');
    }
  } else {
    console.error(message, String(error));
  }
};

export const safeLog = (message: string, data?: any): void => {
  if (data === undefined) {
    console.log(message);
    return;
  }

  if (data instanceof Error) {
    console.log(message, data.message);
  } else if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    console.log(message, data);
  } else if (data && typeof data === 'object') {
    try {
      console.log(message, JSON.stringify(data, null, 2));
    } catch {
      console.log(message, '[Object could not be serialized]');
    }
  } else {
    console.log(message, String(data));
  }
};