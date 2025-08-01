import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import MEPs from "@/pages/meps";
import MEPProfile from "@/pages/mep-profile";
import Committees from "@/pages/committees";
import CommitteeDetail from "@/pages/committee-detail";
import Admin from "@/pages/admin";
import Changes from "@/pages/changes";
import Monitoring from "@/pages/monitoring";
import AdminUsers from "@/pages/admin-users";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/meps" component={MEPs} />
          <Route path="/meps/:id" component={MEPProfile} />
          <Route path="/committees" component={Committees} />
          <Route path="/committees/:id" component={CommitteeDetail} />
          <Route path="/admin" component={Admin} />
          <Route path="/changes" component={Changes} />
          <Route path="/monitoring" component={Monitoring} />
          <Route path="/admin/users" component={AdminUsers} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthenticatedApp />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Router />
      </main>
      <Footer />
    </div>
  );
}

export default App;
