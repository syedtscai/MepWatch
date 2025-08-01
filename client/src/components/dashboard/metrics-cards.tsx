import { Card, CardContent } from "@/components/ui/card";
import { Users, Layers, Globe, RefreshCw } from "lucide-react";
import type { DashboardStats } from "@/lib/types";

interface MetricsCardsProps {
  stats?: DashboardStats;
  isLoading?: boolean;
}

export function MetricsCards({ stats, isLoading }: MetricsCardsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatLastUpdate = (lastUpdate: Date | null) => {
    if (!lastUpdate) return "Never";
    
    const now = new Date();
    const updateDate = new Date(lastUpdate);
    const diffInHours = Math.floor((now.getTime() - updateDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    return updateDate.toLocaleDateString();
  };

  const cards = [
    {
      title: "Total MEPs",
      value: stats.totalMEPs.toString(),
      icon: Users,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      change: "+2",
      changeText: "from last update",
      changeColor: "text-green-600"
    },
    {
      title: "Active Committees",
      value: stats.totalCommittees.toString(),
      icon: Layers,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      change: null,
      changeText: "No changes",
      changeColor: "text-slate-gray"
    },
    {
      title: "Countries",
      value: stats.totalCountries.toString(),
      icon: Globe,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      change: null,
      changeText: "Complete coverage",
      changeColor: "text-slate-gray"
    },
    {
      title: "Last Update",
      value: formatLastUpdate(stats.lastUpdate),
      icon: RefreshCw,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      change: null,
      changeText: "System operational",
      changeColor: "text-green-600",
      indicator: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-gray">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                <card.icon className={`${card.iconColor} h-6 w-6`} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {card.indicator && (
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              )}
              {card.change && (
                <span className={`${card.changeColor} font-medium mr-1`}>
                  {card.change}
                </span>
              )}
              <span className={card.changeColor}>{card.changeText}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
