import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Monitor from "@/pages/monitor";
import Login from "@/pages/login";
import AdminPanel from "@/pages/admin-panel";
import { useState, useEffect } from "react";

function Navigation() {
  const [location] = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    fetch("/api/auth/session")
      .then(res => res.json())
      .then(data => {
        if (data.user?.role === 'admin') {
          setIsAdmin(true);
        }
      })
      .catch(() => setIsAdmin(false));
  }, []);

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
            {isAdmin && (
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

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check session status
    fetch("/api/auth/session")
      .then(res => {
        if (!res.ok) {
          throw new Error("Not authenticated");
        }
        return res.json();
      })
      .then(() => setIsAuthenticated(true))
      .catch(() => {
        setIsAuthenticated(false);
        setLocation("/login");
      });
  }, [setLocation]);

  // Show nothing while checking authentication
  if (isAuthenticated === null) {
    return null;
  }

  // Show component if authenticated
  return isAuthenticated ? <Component /> : null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <ProtectedRoute component={Home} />} />
      <Route path="/monitor" component={() => <ProtectedRoute component={Monitor} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={AdminPanel} />} />
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