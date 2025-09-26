import { AppState, WoTComponent, TDInfo, ParsedAffordance, AffordanceGroup, LayoutSnapshot } from '../types';

export interface DashboardData {
  name: string;
  description?: string;
  version: string;
  timestamp: number;
  tdInfos: TDInfo[];
  components: WoTComponent[];
  availableAffordances: ParsedAffordance[];
  groups?: AffordanceGroup[];
  layoutSnapshot?: LayoutSnapshot;
}

class DashboardService {
  private readonly STORAGE_KEY = 'ui-wot-dashboards';
  private readonly VERSION = '1.0.0';

  /**
   * Save the current dashboard state
   */
  saveDashboard(state: AppState, name: string, description?: string): void {
    const normalized = this.buildSerializableSnapshot(state, { name, description });
    const dashboardData: DashboardData = normalized;

    const existingDashboards = this.getSavedDashboards();
    const updatedDashboards = {
      ...existingDashboards,
      [name]: dashboardData,
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
   * Export from live AppState to JSON with connectivity info preserved.
   */
  exportFromState(state: AppState, opts: { name?: string; description?: string } = {}): void {
    const snapshot = this.buildSerializableSnapshot(state, { name: opts.name || state.tdInfos[0]?.title || 'dashboard', description: opts.description });
    this.exportDashboard(snapshot);
  }

  /**
   * Import dashboard from JSON file
   */
  async importDashboard(file: File): Promise<DashboardData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = event => {
        try {
          const jsonString = event.target?.result as string;
          const data: DashboardData = JSON.parse(jsonString);
          // Normalize connectivity: ensure tdInfos have proper source entries and usable content
          data.tdInfos = (data.tdInfos || []).map(td => {
            const out: TDInfo = { ...td } as TDInfo;
            if (!out.source) {
              if ((out as any).td) {
                const tdJson = (out as any).td;
                out.source = { type: 'file', content: new File([JSON.stringify(tdJson, null, 2)], `${out.title || 'thing'}.json`, { type: 'application/json' }) };
              } else {
                out.source = { type: 'url', content: '' };
              }
            } else if (out.source.type === 'file') {
              const c: any = (out.source as any).content;
              if (typeof c === 'string') {
                try {
                  const parsed = JSON.parse(c);
                  (out as any).td = parsed;
                  out.source = { type: 'file', content: new File([JSON.stringify(parsed, null, 2)], `${out.title || 'thing'}.json`, { type: 'application/json' }) };
                } catch {}
              }
            }
            return out;
          });

          // Fill component.tdUrl from tdInfos that have URL sources
          const tdUrlById = new Map<string, string>();
          (data.tdInfos || []).forEach(t => {
            if (t.source?.type === 'url' && t.source.content) tdUrlById.set(t.id, String(t.source.content));
          });
          data.components = (data.components || []).map(c => ({ ...c, tdUrl: c.tdUrl || tdUrlById.get(c.tdId) }));

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
   * Create a serializable snapshot that preserves connectivity:
   * For URL-based TDs, keep the URL in tdInfos.source.content and copy it to components[i].tdUrl for redundancy.
   */
  private buildSerializableSnapshot(state: AppState, meta: { name: string; description?: string }): DashboardData {
    const tdInfos: TDInfo[] = state.tdInfos.map(info => {
      if (info.source?.type === 'url') {
        return { ...info, source: { type: 'url', content: String(info.source.content) } } as TDInfo;
      }
      // For file sources, embed TD JSON content for portability
      try {
        if (info.td) {
          return { ...info, source: { type: 'file', content: JSON.stringify(info.td) as unknown as File } } as unknown as TDInfo;
        }
      } catch {}
      return info;
    });

    // Add tdUrl redundancy on components for direct element wiring
    const tdUrlById = new Map<string, string>();
    tdInfos.forEach(t => {
      if (t.source?.type === 'url' && t.source.content) tdUrlById.set(t.id, String(t.source.content));
    });
    const components: WoTComponent[] = state.components.map(c => ({
      ...c,
      tdUrl: c.tdUrl || tdUrlById.get(c.tdId),
    }));

    return {
      name: meta.name,
      description: meta.description,
      version: this.VERSION,
      timestamp: Date.now(),
      tdInfos,
      components,
      availableAffordances: state.availableAffordances,
      groups: state.groups,
      layoutSnapshot: state.layoutSnapshot,
    };
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
