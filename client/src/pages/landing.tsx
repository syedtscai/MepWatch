import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Globe, Database, Clock, Shield } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-blue-600 rounded-lg mr-4">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              EU MEP Watch
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Professional intelligence platform for tracking European Parliament members, committees, and parliamentary activities. 
            Comprehensive data analysis for policy professionals, lobbyists, and government affairs teams.
          </p>
        </div>

        {/* Key Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6 text-blue-600" />
                <CardTitle className="text-lg">718 MEP Profiles</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Complete profiles for all current Members of European Parliament with political affiliations, committee memberships, and contact information.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Building2 className="h-6 w-6 text-blue-600" />
                <CardTitle className="text-lg">Committee Tracking</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Monitor all EU Parliament committees, their compositions, leadership roles, and upcoming activities for strategic insights.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Clock className="h-6 w-6 text-blue-600" />
                <CardTitle className="text-lg">Daily Updates</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Automated synchronization with official EU Parliament APIs ensures you have the latest information at 2:00 AM UTC daily.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Capabilities */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Database className="h-6 w-6 text-blue-600" />
                <CardTitle className="text-lg">Data Export & Analytics</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Professional export capabilities in CSV, JSON, and PDF formats. Advanced filtering and search functionality for targeted analysis and reporting.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Globe className="h-6 w-6 text-blue-600" />
                <CardTitle className="text-lg">27 EU Member States</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Complete coverage across all European Union member states with authentic data distribution and political group representations.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Authentication Section */}
        <Card className="border-0 shadow-xl bg-white dark:bg-gray-800 max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">
              Secure Access Required
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              This professional intelligence platform requires authentication to access comprehensive EU Parliament data and analytics.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold"
            >
              Access Platform
            </Button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Secure authentication powered by Replit
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500 dark:text-gray-400">
          <p className="text-sm">
            Professional EU Parliament monitoring platform • Real-time data synchronization • 
            Comprehensive political intelligence
          </p>
        </div>
      </div>
    </div>
  );
}