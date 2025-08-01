import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, FileText, FileSpreadsheet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SearchFilters, FilterOption } from "@/lib/types";

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onExport?: (type: 'csv' | 'json' | 'pdf') => void;
}

export function SearchFiltersComponent({ filters, onFiltersChange, onExport }: SearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const { data: countries } = useQuery({
    queryKey: ['/api/filters/countries'],
    queryFn: () => api.getCountries(),
  });

  const { data: politicalGroups } = useQuery({
    queryKey: ['/api/filters/political-groups'],
    queryFn: () => api.getPoliticalGroups(),
  });

  const { data: committees } = useQuery({
    queryKey: ['/api/filters/committees'],
    queryFn: () => api.getCommitteeOptions(),
  });

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    const newFilters = { ...localFilters, [key]: value === 'all' ? undefined : value, page: 1 };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleReset = () => {
    const resetFilters = { page: 1, limit: filters.limit };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <CardTitle>Search MEPs & Committees</CardTitle>
          {onExport && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('csv')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('json')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-gray h-4 w-4" />
          <Input
            placeholder="Search by name, country, or political party..."
            value={localFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2">Country</Label>
            <Select
              value={localFilters.country || 'all'}
              onValueChange={(value) => handleFilterChange('country', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries?.map((country) => (
                  <SelectItem key={country.code} value={country.code || 'unknown'}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2">Political Group</Label>
            <Select
              value={localFilters.politicalGroup || 'all'}
              onValueChange={(value) => handleFilterChange('politicalGroup', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {politicalGroups?.map((group) => (
                  <SelectItem key={group.code} value={group.code || 'unknown'}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2">Committee</Label>
            <Select
              value={localFilters.committee || 'all'}
              onValueChange={(value) => handleFilterChange('committee', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Committees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Committees</SelectItem>
                {committees?.map((committee) => (
                  <SelectItem key={committee.code} value={committee.code || 'unknown'}>
                    {committee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={handleApplyFilters} className="flex-1">
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
