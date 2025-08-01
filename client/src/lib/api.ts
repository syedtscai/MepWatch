import { apiRequest } from "./queryClient";
import type { 
  MEP, 
  Committee, 
  DashboardStats, 
  ChangeLog, 
  SearchFilters, 
  PaginatedResponse,
  FilterOption 
} from "./types";

export const api = {
  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiRequest("GET", "/api/dashboard/stats");
    return response.json();
  },

  getRecentChanges: async (limit = 10): Promise<ChangeLog[]> => {
    const response = await apiRequest("GET", `/api/dashboard/recent-changes?limit=${limit}`);
    return response.json();
  },

  // MEPs
  getMEPs: async (filters: SearchFilters = {}): Promise<PaginatedResponse<MEP>> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const response = await apiRequest("GET", `/api/meps?${params.toString()}`);
    return response.json();
  },

  getMEP: async (id: string): Promise<MEP> => {
    const response = await apiRequest("GET", `/api/meps/${id}`);
    return response.json();
  },

  // Committees
  getCommittees: async (page = 1, limit = 50): Promise<PaginatedResponse<Committee>> => {
    const response = await apiRequest("GET", `/api/committees?page=${page}&limit=${limit}`);
    return response.json();
  },

  getCommittee: async (id: string): Promise<Committee> => {
    const response = await apiRequest("GET", `/api/committees/${id}`);
    return response.json();
  },

  // Exports
  exportMEPsCSV: async (filters: SearchFilters = {}): Promise<void> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const response = await apiRequest("GET", `/api/export/meps/csv?${params.toString()}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eu-meps-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  exportMEPsJSON: async (filters: SearchFilters = {}): Promise<void> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const response = await apiRequest("GET", `/api/export/meps/json?${params.toString()}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eu-meps-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  exportCommitteesCSV: async (): Promise<void> => {
    const response = await apiRequest("GET", "/api/export/committees/csv");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eu-committees-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Data sync
  triggerDataSync: async (): Promise<{ message: string }> => {
    const response = await apiRequest("POST", "/api/sync/trigger");
    return response.json();
  },

  getSyncStatus: async (): Promise<any> => {
    const response = await apiRequest("GET", "/api/sync/status");
    return response.json();
  },

  // Filter options
  getCountries: async (): Promise<FilterOption[]> => {
    const response = await apiRequest("GET", "/api/filters/countries");
    return response.json();
  },

  getPoliticalGroups: async (): Promise<FilterOption[]> => {
    const response = await apiRequest("GET", "/api/filters/political-groups");
    return response.json();
  },

  getCommitteeOptions: async (): Promise<FilterOption[]> => {
    const response = await apiRequest("GET", "/api/filters/committees");
    return response.json();
  },
};
