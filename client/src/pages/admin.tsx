import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, Clock, Database, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SchedulerStatus {
  isRunning: boolean;
  nextRun: string | null;
  timezone: string;
}

interface SyncStatus {
  lastSync: {
    status: string;
    completedAt?: string;
    recordsProcessed?: number;
    recordsCreated?: number;
    recordsUpdated?: number;
    errors?: string[] | null;
  };
  scheduler: SchedulerStatus;
}

/**
 * Admin Dashboard - System status and data synchronization management
 * 
 * Provides administrative controls and monitoring for:
 * - Automated data synchronization status
 * - Manual sync triggering
 * - System health monitoring
 * - EU Parliament API connection status
 */
export default function AdminPage() {
  const { toast } = useToast();

  const { data: syncStatus, refetch: refetchStatus } = useQuery<SyncStatus>({
    queryKey: ['/api/sync/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: apiConnection, refetch: refetchConnection } = useQuery<{ connected: boolean; message: string }>({
    queryKey: ['/api/sync/test-connection'],
    refetchInterval: 60000, // Check connection every minute
  });

  const handleManualSync = async () => {
    try {
      const response = await fetch('/api/scheduler/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Sync Started",
          description: "Manual data synchronization has been triggered successfully.",
        });
        // Refresh status after starting sync
        setTimeout(() => {
          refetchStatus();
        }, 2000);
      } else {
        throw new Error(result.message || 'Sync failed');
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to start synchronization.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Running</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'never_run':
        return <Badge variant="secondary">Never Run</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
        <p className="text-muted-foreground">
          Monitor and manage EU Parliament data synchronization and system health.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Automated Sync Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Automated Synchronization
            </CardTitle>
            <CardDescription>
              Daily data sync with EU Parliament APIs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Scheduler Status</span>
              <Badge variant={syncStatus?.scheduler.isRunning ? "default" : "secondary"}>
                {syncStatus?.scheduler.isRunning ? "Active" : "Inactive"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Next Scheduled Run</span>
              <span className="text-sm font-medium">
                {syncStatus?.scheduler.nextRun || "Not scheduled"}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Timezone</span>
              <span className="text-sm font-medium">
                {syncStatus?.scheduler.timezone || "UTC"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Last Sync Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Last Synchronization
            </CardTitle>
            <CardDescription>
              Most recent data update status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              {getStatusBadge(syncStatus?.lastSync.status || 'unknown')}
            </div>
            
            {syncStatus?.lastSync.completedAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completed At</span>
                <span className="text-sm font-medium">
                  {formatDate(syncStatus.lastSync.completedAt)}
                </span>
              </div>
            )}
            
            {syncStatus?.lastSync.recordsProcessed !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Records Processed</span>
                <span className="text-sm font-medium">
                  {syncStatus.lastSync.recordsProcessed.toLocaleString()}
                </span>
              </div>
            )}

            {syncStatus?.lastSync.errors && syncStatus.lastSync.errors.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Errors</span>
                <div className="text-sm text-red-600 space-y-1">
                  {syncStatus.lastSync.errors.slice(0, 3).map((error, index) => (
                    <div key={index} className="text-xs bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              EU Parliament API
            </CardTitle>
            <CardDescription>
              Connection to official data sources
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Connection Status</span>
              <Badge variant={apiConnection?.connected ? "default" : "destructive"}>
                {apiConnection?.connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {apiConnection?.message || "Checking connection..."}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchConnection()}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
          </CardContent>
        </Card>

        {/* Manual Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Manual Controls
            </CardTitle>
            <CardDescription>
              Trigger immediate data synchronization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Manually trigger a full synchronization with EU Parliament APIs. 
              This will update all MEP profiles, committee memberships, and parliamentary events.
            </div>
            
            <Separator />
            
            <Button 
              onClick={handleManualSync}
              className="w-full"
              disabled={syncStatus?.lastSync.status === 'running'}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {syncStatus?.lastSync.status === 'running' ? 'Sync in Progress...' : 'Start Manual Sync'}
            </Button>

            <Button 
              variant="outline"
              onClick={() => refetchStatus()}
              className="w-full"
            >
              <Clock className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            Current system status and data overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">718</div>
              <div className="text-sm text-muted-foreground">Total MEPs</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">20</div>
              <div className="text-sm text-muted-foreground">Committees</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-purple-600">27</div>
              <div className="text-sm text-muted-foreground">EU Countries</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-orange-600">Daily</div>
              <div className="text-sm text-muted-foreground">Auto Sync</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}