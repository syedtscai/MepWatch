import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CommitteeGrid } from "@/components/committees/committee-grid";
import { useState } from "react";

export default function Committees() {
  const [page, setPage] = useState(1);
  const limit = 24;

  const { data: committeesData, isLoading } = useQuery({
    queryKey: ['/api/committees', page, limit],
    queryFn: () => api.getCommittees(page, limit),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Parliamentary Committees</h2>
          <p className="text-slate-gray">Explore all EU Parliament committees and their memberships</p>
        </div>

        {committeesData && (
          <CommitteeGrid
            data={committeesData}
            isLoading={isLoading}
          />
        )}

        {isLoading && !committeesData && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </div>
  );
}
