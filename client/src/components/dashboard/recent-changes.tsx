import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, ArrowRightLeft } from "lucide-react";
import type { ChangeLog } from "@/lib/types";

interface RecentChangesProps {
  changes: ChangeLog[];
  isLoading?: boolean;
}

export function RecentChanges({ changes, isLoading }: RecentChangesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return <Plus className="text-green-600 h-4 w-4" />;
      case 'updated':
        return <Edit className="text-blue-600 h-4 w-4" />;
      case 'transferred':
        return <ArrowRightLeft className="text-amber-600 h-4 w-4" />;
      default:
        return <Edit className="text-gray-600 h-4 w-4" />;
    }
  };

  const getChangeIconBg = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return 'bg-green-100';
      case 'updated':
        return 'bg-blue-100';
      case 'transferred':
        return 'bg-amber-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getBadgeVariant = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return 'default';
      case 'updated':
        return 'secondary';
      case 'transferred':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatChangeDescription = (change: ChangeLog) => {
    const entityName = change.newValues?.fullName || change.newValues?.name || `${change.entityType} ${change.entityId}`;
    
    switch (change.changeType) {
      case 'created':
        return `${entityName} was added to the system`;
      case 'updated':
        return `${entityName} profile was updated`;
      default:
        return `${entityName} was modified`;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const changeDate = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - changeDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Changes</CardTitle>
          <Button variant="ghost" size="sm">
            View All Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {changes.length === 0 ? (
          <p className="text-slate-gray text-center py-4">No recent changes</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {changes.map((change) => (
              <div key={change.id} className="py-4 flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 ${getChangeIconBg(change.changeType)} rounded-full flex items-center justify-center`}>
                    {getChangeIcon(change.changeType)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {formatChangeDescription(change)}
                  </p>
                  <p className="text-sm text-slate-gray">
                    {formatTimestamp(change.createdAt)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Badge variant={getBadgeVariant(change.changeType)}>
                    {change.changeType.charAt(0).toUpperCase() + change.changeType.slice(1)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
