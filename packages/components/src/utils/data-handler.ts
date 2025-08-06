/**
 * Simple utility for handling data operations with basic error handling
 * and success feedback for UI components.
 */

export interface DataResult {
  success: boolean;
  value?: any;
  error?: string;
}

export class DataHandler {
  /**
   * Read data from a device endpoint
   */
  static async readFromDevice(url: string): Promise<DataResult> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to read data: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        value: data
      };

    } catch (error) {
      return {
        success: false,
        error: `Connection failed: ${error.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Write data to a device endpoint
   */
  static async writeToDevice(url: string, value: any): Promise<DataResult> {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(value)
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to send data: ${response.status} ${response.statusText}`
        };
      }

      return {
        success: true,
        value: value
      };

    } catch (error) {
      return {
        success: false,
        error: `Connection failed: ${error.message || 'Unknown error'}`
      };
    }
  }
}
