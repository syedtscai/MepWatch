import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { MEP, PaginatedResponse } from "@/lib/types";

interface MEPTableProps {
  data: PaginatedResponse<MEP>;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
}

export function MEPTable({ data, isLoading, onPageChange }: MEPTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Members of European Parliament</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="w-16 h-6 bg-gray-200 rounded"></div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPoliticalGroupColor = (group?: string) => {
    const colors: Record<string, string> = {
      'EPP': 'bg-blue-100 text-blue-800',
      'S&D': 'bg-red-100 text-red-800',
      'RE': 'bg-green-100 text-green-800',
      'ID': 'bg-yellow-100 text-yellow-800',
      'ECR': 'bg-purple-100 text-purple-800',
      'Greens/EFA': 'bg-emerald-100 text-emerald-800',
      'GUE/NGL': 'bg-pink-100 text-pink-800',
    };
    return colors[group || ''] || 'bg-gray-100 text-gray-800';
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Members of European Parliament</CardTitle>
          <span className="text-sm text-slate-gray">
            Showing {((data.pagination.page - 1) * data.pagination.limit) + 1}-
            {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of {data.pagination.total} results
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Political Group</TableHead>
                <TableHead>Committees</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((mep) => (
                <TableRow key={mep.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={mep.photoUrl} alt={mep.fullName} />
                        <AvatarFallback>
                          {getInitials(mep.firstName, mep.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">{mep.fullName}</div>
                        <div className="text-sm text-slate-gray">
                          MEP since {new Date(mep.createdAt).getFullYear()}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-900">{mep.country}</span>
                  </TableCell>
                  <TableCell>
                    {mep.politicalGroupAbbr && (
                      <Badge className={getPoliticalGroupColor(mep.politicalGroupAbbr)}>
                        {mep.politicalGroupAbbr}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {mep.committees.slice(0, 2).map((committee) => (
                        <Badge key={committee.committee.id} variant="secondary">
                          {committee.committee.code}
                        </Badge>
                      ))}
                      {mep.committees.length > 2 && (
                        <Badge variant="outline">
                          +{mep.committees.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Link href={`/meps/${mep.id}`}>
                        <Button variant="ghost" size="sm" title="View profile">
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
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-slate-gray">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(data.pagination.page - 1)}
              disabled={data.pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(data.pagination.page + 1)}
              disabled={data.pagination.page >= data.pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
