import { AppState, WoTComponent, TDInfo, ParsedAffordance } from '../types';

export interface DashboardData {
  name: string;
  description?: string;
  version: string;
  timestamp: number;
  tdInfos: TDInfo[];
  components: WoTComponent[];
  availableAffordances: ParsedAffordance[];
}

class DashboardService {
  private readonly STORAGE_KEY = 'ui-wot-dashboards';
  private readonly VERSION = '1.0.0';

  /**
   * Save the current dashboard state
   */
  saveDashboard(state: AppState, name: string, description?: string): void {
    const dashboardData: DashboardData = {
      name,
      description,
      version: this.VERSION,
      timestamp: Date.now(),
      tdInfos: state.tdInfos,
      components: state.components,
      availableAffordances: state.availableAffordances,
    };

    const existingDashboards = this.getSavedDashboards();
    const updatedDashboards = {
      ...existingDashboards,
      [name]: dashboardData
    };

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedDashboards));
    } catch (error) {
      console.error('Failed to save dashboard:', error);
      throw new Error('Failed to save dashboard. Storage may be full.');
    }
  }

  /**
   * Load a saved dashboard
   */
  loadDashboard(name: string): DashboardData | null {
    const savedDashboards = this.getSavedDashboards();
    return savedDashboards[name] || null;
  }

  /**
   * Get all saved dashboards
   */
  getSavedDashboards(): Record<string, DashboardData> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load dashboards:', error);
      return {};
    }
  }

  /**
   * Delete a saved dashboard
   */
  deleteDashboard(name: string): void {
    const existingDashboards = this.getSavedDashboards();
    delete existingDashboards[name];
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingDashboards));
    } catch (error) {
      console.error('Failed to delete dashboard:', error);
      throw new Error('Failed to delete dashboard.');
    }
  }

  /**
   * Export dashboard as JSON file
   */
  exportDashboard(data: DashboardData): void {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_dashboard.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Import dashboard from JSON file
   */
  async importDashboard(file: File): Promise<DashboardData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const jsonString = event.target?.result as string;
          const data: DashboardData = JSON.parse(jsonString);
          
          // Validate the dashboard data structure
          if (!this.validateDashboardData(data)) {
            reject(new Error('Invalid dashboard file format'));
            return;
          }
          
          resolve(data);
        } catch (error) {
          reject(new Error('Failed to parse dashboard file'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read dashboard file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Validate dashboard data structure
   */
  private validateDashboardData(data: any): data is DashboardData {
    return (
      data &&
      typeof data.name === 'string' &&
      typeof data.version === 'string' &&
      typeof data.timestamp === 'number' &&
      Array.isArray(data.tdInfos) &&
      Array.isArray(data.components) &&
      Array.isArray(data.availableAffordances)
    );
  }

  /**
   * Get dashboard statistics
   */
  getDashboardStats(): { count: number; totalSize: number } {
    const dashboards = this.getSavedDashboards();
    const count = Object.keys(dashboards).length;
    const totalSize = JSON.stringify(dashboards).length;
    
    return { count, totalSize };
  }
}

export const dashboardService = new DashboardService();
