import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, ArrowRightLeft, RefreshCw, Calendar, Database } from 'lucide-react';
import type { ChangeLog } from '@/lib/types';

/**
 * Changes Page - Complete change history and data update tracking
 * 
 * Provides comprehensive view of:
 * - All data changes and updates
 * - System synchronization history
 * - MEP profile modifications
 * - Committee membership changes
 * - Data integrity tracking
 */
export default function ChangesPage() {
  const { data: allChanges, isLoading, refetch } = useQuery<ChangeLog[]>({
    queryKey: ['/api/dashboard/recent-changes'],
    queryFn: () => fetch('/api/dashboard/recent-changes?limit=100').then(res => res.json()),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: syncStatus } = useQuery<{ lastSync: any; scheduler: any }>({
    queryKey: ['/api/sync/status'],
    refetchInterval: 30000,
  });

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
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const changeDate = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - changeDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const groupChangesByDate = (changes: ChangeLog[]) => {
    const groups: { [key: string]: ChangeLog[] } = {};
    
    changes.forEach(change => {
      const date = new Date(change.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(change);
    });
    
    return Object.entries(groups).sort(([a], [b]) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
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
      </div>
    );
  }

  const groupedChanges = allChanges ? groupChangesByDate(allChanges) : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Changes</h1>
          <p className="text-muted-foreground">
            Complete history of data updates and system modifications
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Sync Status Summary */}
      {syncStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Synchronization Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {syncStatus.lastSync?.recordsProcessed?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-muted-foreground">Records Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {syncStatus.lastSync?.status === 'completed' ? 'Active' : 'Pending'}
                </div>
                <div className="text-sm text-muted-foreground">Sync Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">Daily</div>
                <div className="text-sm text-muted-foreground">Auto Updates</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Changes History */}
      <div className="space-y-6">
        {groupedChanges.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Changes Found</h3>
              <p className="text-gray-600">
                System changes and updates will appear here as they occur.
              </p>
            </CardContent>
          </Card>
        ) : (
          groupedChanges.map(([date, changes]) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  <Badge variant="secondary" className="ml-auto">
                    {changes.length} changes
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {changes.map((change, index) => (
                    <div key={change.id}>
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 ${getChangeIconBg(change.changeType)} rounded-full flex items-center justify-center`}>
                            {getChangeIcon(change.changeType)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {formatChangeDescription(change)}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(change.createdAt)}
                              </span>
                              <Badge variant={getBadgeVariant(change.changeType)} className="text-xs">
                                {change.changeType.charAt(0).toUpperCase() + change.changeType.slice(1)}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatTimestamp(change.createdAt)}
                          </p>
                          {change.newValues && Object.keys(change.newValues).length > 0 && (
                            <div className="mt-2 p-2 bg-gray-50 rounded-md">
                              <p className="text-xs text-muted-foreground mb-1">Updated fields:</p>
                              <div className="flex flex-wrap gap-1">
                                {Object.keys(change.newValues).map(field => (
                                  <Badge key={field} variant="outline" className="text-xs">
                                    {field}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {index < changes.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}