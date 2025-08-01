import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Clock, Shield, TrendingUp, Database, Wifi, Users } from "lucide-react";
import { useState } from "react";

interface MonitoringData {
  overall_score: number;
  status: string;
  health: any;
  performance: any;
  data_quality: any;
  security: any;
  timestamp: string;
}

interface Alert {
  type: string;
  message: string;
  timestamp: string;
  severity: string;
  category: string;
}

export default function Monitoring() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: comprehensiveStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/monitoring/status/comprehensive'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['/api/monitoring/alerts'],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const { data: performanceMetrics, isLoading: performanceLoading } = useQuery({
    queryKey: ['/api/monitoring/metrics/performance'],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: dataQualityReport, isLoading: qualityLoading } = useQuery({
    queryKey: ['/api/monitoring/metrics/data-quality'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const { data: securityReport, isLoading: securityLoading } = useQuery({
    queryKey: ['/api/monitoring/metrics/security'],
    refetchInterval: 600000, // Refresh every 10 minutes
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'excellent':
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'good':
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'fair':
        return 'text-orange-600 bg-orange-100';
      case 'poor':
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (statusLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading monitoring dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const status = comprehensiveStatus as MonitoringData;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Production Monitoring</h1>
          <p className="text-gray-600 mt-2">System health, performance, and security monitoring</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => refetchStatus()} variant="outline">
            Refresh Status
          </Button>
          <Button onClick={() => refetchAlerts()} variant="outline">
            Refresh Alerts
          </Button>
        </div>
      </div>

      {/* Overall Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.overall_score || 0}%</div>
            <Progress value={status?.overall_score || 0} className="mt-2" />
            <Badge className={`mt-2 ${getStatusColor(status?.status || 'unknown')}`}>
              {status?.status || 'Unknown'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.health?.status === 'healthy' ? 'Healthy' : 'Issues'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {status?.health?.alerts || 0} active alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.data_quality?.overall_score || 0}%</div>
            <p className="text-xs text-muted-foreground mt-2">
              Data integrity score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.security?.overall_security_score || 0}%</div>
            <p className="text-xs text-muted-foreground mt-2">
              Security posture
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="quality">Data Quality</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cache Hit Rate</span>
                      <span className="text-sm font-medium">
                        {((status?.performance?.cacheEffectiveness || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={(status?.performance?.cacheEffectiveness || 0) * 100} className="mt-1" />
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span className="text-sm">Database Health</span>
                      <Badge className={getStatusColor(status?.performance?.databaseHealth || 'unknown')}>
                        {status?.performance?.databaseHealth || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span className="text-sm">EU API Health</span>
                      <Badge className={getStatusColor(status?.performance?.euApiHealth || 'unknown')}>
                        {status?.performance?.euApiHealth || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Quality Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Data Quality Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between">
                      <span className="text-sm">Sync Status</span>
                      <Badge className={getStatusColor(
                        status?.data_quality?.sync_validation?.isValid ? 'healthy' : 'critical'
                      )}>
                        {status?.data_quality?.sync_validation?.isValid ? 'Valid' : 'Issues'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total MEPs</span>
                      <span className="text-sm font-medium">
                        {status?.data_quality?.sync_validation?.metrics?.total_meps || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Committees</span>
                      <span className="text-sm font-medium">
                        {status?.data_quality?.sync_validation?.metrics?.total_committees || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>System Recommendations</CardTitle>
              <CardDescription>
                Automated recommendations based on current system analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  ...(status?.performance?.recommendations || []),
                  ...(status?.data_quality?.recommendations || []),
                  ...(status?.security?.recommendations || [])
                ].slice(0, 5).map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{recommendation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>API response times and system performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {performanceMetrics?.performance_report?.apiPerformance && 
                    Object.entries(performanceMetrics.performance_report.apiPerformance).map(([endpoint, time]) => (
                      <div key={endpoint} className="flex justify-between items-center">
                        <span className="text-sm">{endpoint.replace(/api_|_response_time/g, '').replace(/_/g, '/')}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{(time as number).toFixed(0)}ms</span>
                          <Badge className={time as number > 2000 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                            {time as number > 2000 ? 'Slow' : 'Good'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Completeness</CardTitle>
                <CardDescription>Field population rates across datasets</CardDescription>
              </CardHeader>
              <CardContent>
                {qualityLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dataQualityReport?.completeness?.completeness && 
                      Object.entries(dataQualityReport.completeness.completeness).map(([field, percentage]) => (
                        <div key={field}>
                          <div className="flex justify-between text-sm">
                            <span>{field.replace(/_/g, ' ')}</span>
                            <span>{(percentage as number).toFixed(1)}%</span>
                          </div>
                          <Progress value={percentage as number} className="mt-1" />
                        </div>
                      ))
                    }
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Source Verification</CardTitle>
                <CardDescription>Official data source connectivity and validation</CardDescription>
              </CardHeader>
              <CardContent>
                {qualityLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dataQualityReport?.source_verification?.sourceVerification && 
                      Object.entries(dataQualityReport.source_verification.sourceVerification).map(([source, status]) => (
                        <div key={source} className="flex justify-between items-center">
                          <span className="text-sm">{source.replace(/_/g, ' ')}</span>
                          <Badge className={status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {status ? 'Connected' : 'Error'}
                          </Badge>
                        </div>
                      ))
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Audit Results</CardTitle>
                <CardDescription>Latest security assessment findings</CardDescription>
              </CardHeader>
              <CardContent>
                {securityLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Security Score</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold">{securityReport?.audit_results?.score || 0}/100</span>
                        <Badge className={getStatusColor(
                          (securityReport?.audit_results?.score || 0) >= 90 ? 'excellent' : 
                          (securityReport?.audit_results?.score || 0) >= 70 ? 'good' : 'poor'
                        )}>
                          {(securityReport?.audit_results?.score || 0) >= 90 ? 'Excellent' : 
                           (securityReport?.audit_results?.score || 0) >= 70 ? 'Good' : 'Needs Attention'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">Issues Found:</div>
                      {securityReport?.audit_results?.issues?.length > 0 ? (
                        <ul className="text-sm space-y-1">
                          {securityReport.audit_results.issues.map((issue: string, index: number) => (
                            <li key={index} className="flex items-start space-x-2">
                              <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-green-600">No security issues detected</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>GDPR Compliance</CardTitle>
                <CardDescription>EU data protection compliance status</CardDescription>
              </CardHeader>
              <CardContent>
                {securityLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Compliance Status</span>
                      <Badge className={securityReport?.gdpr_compliance?.compliant ? 
                        'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }>
                        {securityReport?.gdpr_compliance?.compliant ? 'Compliant' : 'Issues Found'}
                      </Badge>
                    </div>
                    {securityReport?.gdpr_compliance?.issues?.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">Compliance Issues:</div>
                        <ul className="text-sm space-y-1">
                          {securityReport.gdpr_compliance.issues.map((issue: string, index: number) => (
                            <li key={index} className="flex items-start space-x-2">
                              <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Recent monitoring and security alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts?.alerts?.length > 0 ? (
                    alerts.alerts.map((alert: Alert, index: number) => (
                      <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0">
                          {alert.severity === 'critical' ? (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          ) : alert.severity === 'high' ? (
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <Badge variant="outline">
                              {alert.category}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(alert.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{alert.type}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-gray-600">No active alerts</p>
                      <p className="text-sm text-gray-500">System is operating normally</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}