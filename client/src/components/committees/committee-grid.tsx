import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Bus } from "lucide-react";
import { Link } from "wouter";
import type { Committee, PaginatedResponse } from "@/lib/types";

interface CommitteeGridProps {
  data: PaginatedResponse<Committee>;
  isLoading?: boolean;
  compact?: boolean;
}

export function CommitteeGrid({ data, isLoading, compact = false }: CommitteeGridProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Parliamentary Committees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayCommittees = compact ? data.data.slice(0, 3) : data.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parliamentary Committees</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayCommittees.map((committee) => (
            <div
              key={committee.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">
                  {committee.name}
                </h4>
                <Badge variant="secondary">{committee.code}</Badge>
              </div>

              <div className="space-y-2 mb-4">
                {committee.coordinatorName && (
                  <div className="flex items-center text-sm">
                    <Bus className="text-slate-gray mr-2 h-4 w-4" />
                    <span className="text-gray-700">
                      Chair: <span className="font-medium">{committee.coordinatorName}</span>
                    </span>
                  </div>
                )}
                <div className="flex items-center text-sm">
                  <Users className="text-slate-gray mr-2 h-4 w-4" />
                  <span className="text-gray-700">
                    {committee.members?.length || 0} members
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Link href={`/committees/${committee.id}`} className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full">
                    View Details
                  </Button>
                </Link>
                {committee.officialUrl && (
                  <a
                    href={committee.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View on EU Parliament official website"
                    className="flex-1"
                  >
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      Official ↗
                    </Button>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {compact && data.data.length > 3 && (
          <div className="mt-6 text-center">
            <Link href="/committees">
              <Button variant="outline">
                View All {data.pagination.total} Committees
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
