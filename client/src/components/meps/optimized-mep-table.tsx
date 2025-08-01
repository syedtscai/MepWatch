import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import type { MEP, PaginatedResponse } from "@/lib/types";

interface OptimizedMEPTableProps {
  data: PaginatedResponse<MEP>;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
  enableQuickSearch?: boolean;
}

// Memoized components for performance
const MEPTableRow = ({ mep, onProfileClick }: { 
  mep: MEP; 
  onProfileClick: (id: string) => void;
}) => {
  const getPoliticalGroupColor = useCallback((group?: string) => {
    const colors: Record<string, string> = {
      'EPP': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'S&D': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'RE': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'ID': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'ECR': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Greens/EFA': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      'GUE/NGL': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    };
    return colors[group || ''] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }, []);

  const getInitials = useCallback((firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }, []);

  const handleProfileClick = useCallback(() => {
    onProfileClick(mep.id);
  }, [mep.id, onProfileClick]);

  return (
    <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <TableCell>
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={mep.photoUrl} 
              alt={mep.fullName}
              loading="lazy"
            />
            <AvatarFallback className="text-xs">
              {getInitials(mep.firstName, mep.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {mep.fullName}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              MEP since {mep.termStartDate ? new Date(mep.termStartDate).getFullYear() : '2019'}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">
          {mep.country}
        </span>
      </TableCell>
      <TableCell>
        {mep.politicalGroupAbbr && (
          <Badge className={getPoliticalGroupColor(mep.politicalGroupAbbr)}>
            {mep.politicalGroupAbbr}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <TooltipProvider>
          <div className="flex flex-wrap gap-1 max-w-48">
            {mep.committees.slice(0, 2).map((committee) => (
              <Tooltip key={committee.committee.id}>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="secondary"
                    className="text-xs cursor-help"
                  >
                    {committee.committee.code}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{committee.committee.name}</p>
                  <p className="text-xs text-muted-foreground">Role: {committee.role}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            {mep.committees.length > 2 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs cursor-help">
                    +{mep.committees.length - 2}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="font-medium mb-2">All Committee Memberships:</p>
                  <div className="space-y-1">
                    {mep.committees.map((committee) => (
                      <div key={committee.committee.id} className="flex justify-between text-xs">
                        <span className="font-medium">{committee.committee.code}</span>
                        <span className="text-muted-foreground ml-2">{committee.role}</span>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Link href={`/meps/${mep.id}`}>
            <Button 
              variant="ghost" 
              size="sm" 
              title="View profile"
              onClick={handleProfileClick}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {mep.officialUrl && (
            <a
              href={mep.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="View on EU Parliament official website"
            >
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

const LoadingSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle>Members of European Parliament</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center space-x-4 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            </div>
            <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const PaginationControls = ({ 
  pagination, 
  onPageChange 
}: { 
  pagination: any; 
  onPageChange: (page: number) => void;
}) => {
  const handlePrevious = useCallback(() => {
    onPageChange(pagination.page - 1);
  }, [pagination.page, onPageChange]);

  const handleNext = useCallback(() => {
    onPageChange(pagination.page + 1);
  }, [pagination.page, onPageChange]);

  return (
    <div className="flex items-center justify-between mt-6">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Page {pagination.page} of {pagination.totalPages}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={pagination.page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={pagination.page >= pagination.totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export function OptimizedMEPTable({ 
  data, 
  isLoading, 
  onPageChange,
  onSearch,
  enableQuickSearch = false
}: OptimizedMEPTableProps) {
  const { value: searchQuery, setValue: setSearchQuery, debouncedValue } = useDebouncedSearch();
  
  // Memoized profile click handler
  const handleProfileClick = useCallback((id: string) => {
    // Could add analytics or other side effects here
    console.log(`Viewing MEP profile: ${id}`);
  }, []);

  // Effect for debounced search
  useState(() => {
    if (onSearch && debouncedValue !== searchQuery) {
      onSearch(debouncedValue);
    }
  });

  // Memoized table content
  const tableContent = useMemo(() => {
    if (!data?.data) return null;

    return data.data.map((mep) => (
      <MEPTableRow 
        key={mep.id} 
        mep={mep} 
        onProfileClick={handleProfileClick}
      />
    ));
  }, [data?.data, handleProfileClick]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Members of European Parliament</CardTitle>
          <div className="flex items-center space-x-4">
            {enableQuickSearch && onSearch && (
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Quick search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((data.pagination.page - 1) * data.pagination.limit) + 1}-
              {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of {data.pagination.total} results
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-80">Member</TableHead>
                <TableHead className="w-24">Country</TableHead>
                <TableHead className="w-32">Political Group</TableHead>
                <TableHead className="w-48">Committees</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableContent}
            </TableBody>
          </Table>
        </div>

        <PaginationControls 
          pagination={data.pagination}
          onPageChange={onPageChange || (() => {})}
        />
      </CardContent>
    </Card>
  );
}