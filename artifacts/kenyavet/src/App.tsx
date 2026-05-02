import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import VettingRequests from "@/pages/vetting-requests";
import NewVettingRequest from "@/pages/new-vetting-request";
import VettingRequestDetail from "@/pages/vetting-request-detail";
import Workers from "@/pages/workers";
import WorkerCompare from "@/pages/worker-compare";
import WorkerProfile from "@/pages/worker-profile";
import Staff from "@/pages/staff";
import StaffDetail from "@/pages/staff-detail";
import Reports from "@/pages/reports";
import ReportDetail from "@/pages/report-detail";
import Notifications from "@/pages/notifications";
import Admin from "@/pages/admin";
import Verify from "@/pages/verify";
import Profile from "@/pages/profile";
import Receipt from "@/pages/receipt";
import Ops from "@/pages/ops";
import Billing from "@/pages/billing";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import WorkerPublic from "@/pages/worker-public";
import ReportPublic from "@/pages/report-public";
import Analytics from "@/pages/analytics";
import Messages from "@/pages/messages";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify" component={Verify} />
      <Route path="/w/:qrCode" component={WorkerPublic} />
      <Route path="/r/:shareToken" component={ReportPublic} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      <Route path="/dashboard">
        {() => <PrivateRoute component={Dashboard} />}
      </Route>
      <Route path="/vetting-requests/new">
        {() => <PrivateRoute component={NewVettingRequest} />}
      </Route>
      <Route path="/vetting-requests/:id">
        {() => <PrivateRoute component={VettingRequestDetail} />}
      </Route>
      <Route path="/vetting-requests">
        {() => <PrivateRoute component={VettingRequests} />}
      </Route>
      <Route path="/workers/compare">
        {() => <PrivateRoute component={WorkerCompare} />}
      </Route>
      <Route path="/workers/:id">
        {() => <PrivateRoute component={WorkerProfile} />}
      </Route>
      <Route path="/workers">
        {() => <PrivateRoute component={Workers} />}
      </Route>
      <Route path="/staff/:id">
        {() => <PrivateRoute component={StaffDetail} />}
      </Route>
      <Route path="/staff">
        {() => <PrivateRoute component={Staff} />}
      </Route>
      <Route path="/reports/:id">
        {() => <PrivateRoute component={ReportDetail} />}
      </Route>
      <Route path="/reports">
        {() => <PrivateRoute component={Reports} />}
      </Route>
      <Route path="/notifications">
        {() => <PrivateRoute component={Notifications} />}
      </Route>
      <Route path="/admin">
        {() => <PrivateRoute component={Admin} />}
      </Route>
      <Route path="/profile">
        {() => <PrivateRoute component={Profile} />}
      </Route>
      <Route path="/receipt/:id">
        {() => <PrivateRoute component={Receipt} />}
      </Route>
      <Route path="/ops">
        {() => <PrivateRoute component={Ops} />}
      </Route>
      <Route path="/billing">
        {() => <PrivateRoute component={Billing} />}
      </Route>
      <Route path="/analytics">
        {() => <PrivateRoute component={Analytics} />}
      </Route>
      <Route path="/messages">
        {() => <PrivateRoute component={Messages} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
