import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MetricsCards } from "@/components/dashboard/metrics-cards";
import { RecentChanges } from "@/components/dashboard/recent-changes";
import { SearchFiltersComponent } from "@/components/search/search-filters";
import { MEPTable } from "@/components/meps/mep-table";
import { CommitteeGrid } from "@/components/committees/committee-grid";
import { useState } from "react";
import type { SearchFilters } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [filters, setFilters] = useState<SearchFilters>({ page: 1, limit: 10 });
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: () => api.getDashboardStats(),
  });

  const { data: recentChanges, isLoading: changesLoading } = useQuery({
    queryKey: ['/api/dashboard/recent-changes'],
    queryFn: () => api.getRecentChanges(5),
  });

  const { data: mepsData, isLoading: mepsLoading } = useQuery({
    queryKey: ['/api/meps', filters],
    queryFn: () => api.getMEPs(filters),
  });

  const { data: committeesData, isLoading: committeesLoading } = useQuery({
    queryKey: ['/api/committees', 1, 6],
    queryFn: () => api.getCommittees(1, 6),
  });

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleExport = async (type: 'csv' | 'json' | 'pdf') => {
    try {
      if (type === 'csv') {
        await api.exportMEPsCSV(filters);
        toast({
          title: "Export Started",
          description: "Your CSV export is being downloaded.",
        });
      } else if (type === 'json') {
        await api.exportMEPsJSON(filters);
        toast({
          title: "Export Started",
          description: "Your JSON export is being downloaded.",
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
          <p className="text-slate-gray">Real-time insights into EU Parliament data</p>
        </div>

        {/* Metrics Cards */}
        <MetricsCards stats={stats} isLoading={statsLoading} />

        {/* Search and Filters */}
        <div className="mb-8">
          <SearchFiltersComponent
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onExport={handleExport}
          />
        </div>

        {/* MEP Results Table */}
        {mepsData && (
          <div className="mb-8">
            <MEPTable
              data={mepsData}
              isLoading={mepsLoading}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        {/* Committees Section */}
        {committeesData && (
          <div className="mb-8">
            <CommitteeGrid
              data={committeesData}
              isLoading={committeesLoading}
              compact={true}
            />
          </div>
        )}

        {/* Recent Changes */}
        <RecentChanges
          changes={recentChanges || []}
          isLoading={changesLoading}
        />
      </div>
    </div>
  );
}
