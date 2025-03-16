import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Monitor from "@/pages/monitor";
import Login from "@/pages/login";
import AdminPanel from "@/pages/admin-panel";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";

function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  // Don't show navigation on login page
  if (location === "/login") {
    return null;
  }

  return (
    <nav className="bg-white border-b mb-4">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/">
              <a className="text-primary hover:text-primary/80">Search</a>
            </Link>
            <Link href="/monitor">
              <a className="text-primary hover:text-primary/80">Monitor</a>
            </Link>
            {user?.role === 'admin' && (
              <Link href="/admin">
                <a className="text-primary hover:text-primary/80">Admin Panel</a>
              </Link>
            )}
          </div>
          <button
            onClick={() => {
              fetch("/api/auth/logout", { method: "POST" })
                .then(() => window.location.href = "/login");
            }}
            className="text-primary hover:text-primary/80"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <ProtectedRoute component={Home} />} />
      <Route path="/monitor" component={() => <ProtectedRoute component={Monitor} />} />
      <Route path="/admin" component={() => <AdminRoute component={AdminPanel} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Navigation />
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;