import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Settings from "@/pages/settings";
import DatabasePage from "@/pages/database";
import MarketingAnalyticsPage from "@/pages/marketing-analytics";
import MarketingComparativeAnalytics from "@/pages/marketing-comparative";
import SalesAnalyticsPage from "@/pages/sales-analytics";
import UserManagement from "@/pages/UserManagement";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/database" component={DatabasePage} />
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/marketing" component={MarketingAnalyticsPage} />
          <Route path="/marketing-analytics" component={MarketingAnalyticsPage} />
          <Route path="/marketing-comparative" component={MarketingComparativeAnalytics} />
          <Route path="/sales" component={SalesAnalyticsPage} />
          <Route path="/sales-analytics" component={SalesAnalyticsPage} />
          <Route path="/user-management" component={UserManagement} />
          <Route path="/settings" component={Settings} />
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
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
