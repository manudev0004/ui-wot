/**
 * Shared utility for handling data operations with robust error handling,
 * confirmation, and user feedback across all UI components.
 */

export interface DataOperationResult {
  success: boolean;
  value?: any;
  error?: string;
  statusCode?: number;
}

export interface DataOperationOptions {
  retryCount?: number;
  timeout?: number;
  expectedValueType?: 'number' | 'boolean' | 'string' | 'any';
}

export class DataHandler {
  private static readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  private static readonly DEFAULT_RETRY_COUNT = 2;

  /**
   * Read data from a device endpoint with error handling and validation
   */
  static async readFromDevice(
    url: string, 
    options: DataOperationOptions = {}
  ): Promise<DataOperationResult> {
    const { 
      retryCount = this.DEFAULT_RETRY_COUNT, 
      timeout = this.DEFAULT_TIMEOUT,
      expectedValueType = 'any'
    } = options;

    let lastError: string = '';
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
          
          if (response.status >= 500 && attempt < retryCount) {
            // Retry on server errors
            await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
            continue;
          }
          
          return {
            success: false,
            error: lastError,
            statusCode: response.status
          };
        }

        const data = await response.json();
        const validatedValue = this.validateValue(data, expectedValueType);
        
        if (validatedValue.success) {
          return {
            success: true,
            value: validatedValue.value
          };
        } else {
          return {
            success: false,
            error: validatedValue.error
          };
        }

      } catch (error) {
        if (error.name === 'AbortError') {
          lastError = `Request timeout after ${timeout}ms`;
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
          lastError = 'Network connection failed - device may be offline';
        } else {
          lastError = error.message || 'Unknown error occurred';
        }

        if (attempt < retryCount) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
          continue;
        }
      }
    }

    return {
      success: false,
      error: lastError
    };
  }

  /**
   * Write data to a device endpoint with confirmation and error handling
   */
  static async writeToDevice(
    url: string, 
    value: any, 
    options: DataOperationOptions = {}
  ): Promise<DataOperationResult> {
    const { 
      retryCount = this.DEFAULT_RETRY_COUNT, 
      timeout = this.DEFAULT_TIMEOUT 
    } = options;

    let lastError: string = '';
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: 'PUT',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(value)
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
          
          if (response.status >= 500 && attempt < retryCount) {
            // Retry on server errors
            await this.delay(Math.pow(2, attempt) * 1000);
            continue;
          }
          
          return {
            success: false,
            error: lastError,
            statusCode: response.status
          };
        }

        // Try to read back the value to confirm the write operation
        const confirmationResult = await this.confirmWrite(url, value, options);
        
        return {
          success: true,
          value: confirmationResult.confirmed ? value : undefined,
          error: confirmationResult.confirmed ? undefined : 'Write succeeded but confirmation failed'
        };

      } catch (error) {
        if (error.name === 'AbortError') {
          lastError = `Request timeout after ${timeout}ms`;
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
          lastError = 'Network connection failed - device may be offline';
        } else {
          lastError = error.message || 'Unknown error occurred';
        }

        if (attempt < retryCount) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
      }
    }

    return {
      success: false,
      error: lastError
    };
  }

  /**
   * Confirm that a write operation was successful by reading back the value
   */
  private static async confirmWrite(
    url: string, 
    expectedValue: any, 
    options: DataOperationOptions
  ): Promise<{ confirmed: boolean; actualValue?: any }> {
    try {
      // Wait a moment for the device to process the write
      await this.delay(100);
      
      const readResult = await this.readFromDevice(url, {
        ...options,
        retryCount: 1 // Only one retry for confirmation
      });

      if (readResult.success) {
        const valuesMatch = this.compareValues(expectedValue, readResult.value);
        return {
          confirmed: valuesMatch,
          actualValue: readResult.value
        };
      }
    } catch (error) {
      // Confirmation read failed, but original write may have succeeded
    }

    return { confirmed: false };
  }

  /**
   * Validate that a received value matches the expected type
   */
  private static validateValue(value: any, expectedType: string): { success: boolean; value?: any; error?: string } {
    if (expectedType === 'any') {
      return { success: true, value };
    }

    switch (expectedType) {
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          return { success: false, error: `Expected number but received: ${typeof value}` };
        }
        return { success: true, value: num };
      
      case 'boolean':
        if (typeof value === 'boolean') {
          return { success: true, value };
        }
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (lower === 'true' || lower === '1') return { success: true, value: true };
          if (lower === 'false' || lower === '0') return { success: true, value: false };
        }
        if (typeof value === 'number') {
          return { success: true, value: value !== 0 };
        }
        return { success: false, error: `Expected boolean but received: ${typeof value}` };
      
      case 'string':
        return { success: true, value: String(value) };
      
      default:
        return { success: true, value };
    }
  }

  /**
   * Compare two values for equality (with tolerance for floating point numbers)
   */
  private static compareValues(expected: any, actual: any): boolean {
    if (typeof expected === 'number' && typeof actual === 'number') {
      // For numbers, allow small floating point differences
      return Math.abs(expected - actual) < 0.0001;
    }
    return expected === actual;
  }

  /**
   * Utility function to create a delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get user-friendly error message from operation result
   */
  static getErrorMessage(result: DataOperationResult): string {
    if (result.success) return '';
    
    if (result.statusCode) {
      switch (result.statusCode) {
        case 400:
          return 'Invalid request - check the data format';
        case 401:
          return 'Authentication required';
        case 403:
          return 'Access denied - insufficient permissions';
        case 404:
          return 'Device not found - check the URL';
        case 408:
          return 'Request timeout - device may be slow to respond';
        case 429:
          return 'Too many requests - please wait before trying again';
        case 500:
          return 'Device error - please try again later';
        case 503:
          return 'Device temporarily unavailable';
        default:
          return result.error || 'Unknown error occurred';
      }
    }
    
    return result.error || 'Unknown error occurred';
  }
}
