import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Building2, Calendar, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user } = useAuth();

  const quickActions = [
    {
      title: "Browse MEPs",
      description: "Search and filter through all 718 Members of European Parliament",
      icon: Users,
      href: "/meps",
      color: "bg-blue-500"
    },
    {
      title: "View Committees",
      description: "Explore parliamentary committees and their compositions",
      icon: Building2,
      href: "/committees",
      color: "bg-green-500"
    },
    {
      title: "Dashboard Analytics",
      description: "Access comprehensive statistics and recent changes",
      icon: TrendingUp,
      href: "/",
      color: "bg-purple-500"
    },
    {
      title: "Activity Timeline",
      description: "Track all system changes and data updates",
      icon: Calendar,
      href: "/changes",
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Welcome Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Welcome to EU MEP Watch
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {user?.email ? `Welcome back, ${user.email}` : 'Welcome to your professional EU Parliament intelligence platform'}
          </p>
          <div className="mt-8 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-green-800 dark:text-green-300 font-medium">
              ✓ Successfully authenticated
            </p>
            <p className="text-green-700 dark:text-green-400 text-sm">
              Full access to 718 MEP profiles and parliamentary data
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:shadow-xl transition-all duration-200 cursor-pointer group">
                <CardHeader className="text-center pb-2">
                  <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 dark:text-gray-300 mb-4">
                    {action.description}
                  </CardDescription>
                  <div className="flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                    <span className="text-sm font-medium mr-1">Access</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Platform Features */}
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <span>Complete MEP Database</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Access detailed profiles for all 718 current Members of European Parliament with real-time data from official EU APIs.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <span>Committee Intelligence</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Monitor parliamentary committees, membership changes, and leadership positions across all EU policy areas.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <span>Daily Synchronization</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Automated daily updates at 2:00 AM UTC ensure you always have the latest parliamentary information.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <Link href="/">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}