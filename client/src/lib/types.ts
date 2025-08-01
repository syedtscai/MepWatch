export interface MEP {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  country: string;
  politicalGroup?: string;
  politicalGroupAbbr?: string;
  nationalPoliticalGroup?: string;
  photoUrl?: string;
  email?: string;
  twitter?: string;
  facebook?: string;
  website?: string;
  birthDate?: string;
  birthPlace?: string;
  termStartDate?: string;
  officialUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  committees: Array<{
    mepId: string;
    committeeId: string;
    role?: string;
    committee: Committee;
  }>;
}

export interface Committee {
  id: string;
  code: string;
  name: string;
  nameNational?: string;
  coordinatorName?: string;
  coordinatorGroup?: string;
  officialUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  members?: Array<{
    mepId: string;
    committeeId: string;
    role?: string;
    mep: MEP;
  }>;
}

export interface DashboardStats {
  totalMEPs: number;
  totalCommittees: number;
  totalCountries: number;
  lastUpdate: Date | null;
}

export interface ChangeLog {
  id: string;
  entityType: string;
  entityId: string;
  changeType: string;
  oldValues: any;
  newValues: any;
  createdAt: Date;
}

export interface SearchFilters {
  search?: string;
  country?: string;
  politicalGroup?: string;
  committee?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FilterOption {
  code: string;
  name: string;
}
