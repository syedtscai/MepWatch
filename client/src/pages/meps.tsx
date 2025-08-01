import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SearchFiltersComponent } from "@/components/search/search-filters";
import { MEPTable } from "@/components/meps/mep-table";
import type { SearchFilters } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function MEPs() {
  const [filters, setFilters] = useState<SearchFilters>({ page: 1, limit: 50 });
  const { toast } = useToast();

  const { data: mepsData, isLoading } = useQuery({
    queryKey: ['/api/meps', filters],
    queryFn: () => api.getMEPs(filters),
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Members of European Parliament</h2>
          <p className="text-slate-gray">Search and explore EU MEP profiles and committee memberships</p>
        </div>

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
          <MEPTable
            data={mepsData}
            isLoading={isLoading}
            onPageChange={handlePageChange}
          />
        )}

        {isLoading && !mepsData && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </div>
  );
}
