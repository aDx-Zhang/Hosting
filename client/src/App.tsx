import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Monitor from "@/pages/monitor";
import Login from "@/pages/login";
import AdminPanel from "@/pages/admin-panel";
import { useAuth } from "@/hooks/use-auth";
import { Bell, Settings, User as UserIcon, LogOut } from "lucide-react";
import { Redirect } from "wouter";
import Register from "@/pages/register";
import UserPanel from "@/pages/user-panel";
import { Layout } from "@/components/layout";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AnimatePresence } from "framer-motion";
import { ConnectionStatus } from "@/components/connection-status";
import { useWebSocket } from "@/hooks/use-websocket";

function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { isConnected, isConnecting } = useWebSocket({});

  if (location === "/login" || location === "/register" || !user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const navLinkStyle = (isActive: boolean) => `
    flex items-center gap-2 px-3 py-2 rounded-md transition-colors
    ${isActive 
      ? "bg-primary/30 text-primary border-2 border-primary/40" 
      : "text-gray-400 hover:text-primary hover:bg-primary/20 hover:border hover:border-primary/30"
    }
  `;

  return (
    <header className="sticky top-0 z-50">
      <div className="w-full bg-[#1a1428]/95 backdrop-blur-sm border-b border-purple-700/30">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-primary">FlipX</h1>
            <nav className="flex items-center gap-4">
              <Link href="/">
                <a className={navLinkStyle(location === "/")}>
                  <Bell className="h-4 w-4" />
                  <span>Price Monitors</span>
                </a>
              </Link>
              {user.role === 'admin' ? (
                <Link href="/admin">
                  <a className={navLinkStyle(location === "/admin")}>
                    <Settings className="h-4 w-4" />
                    <span>Admin Panel</span>
                  </a>
                </Link>
              ) : (
                <Link href="/user">
                  <a className={navLinkStyle(location === "/user")}>
                    <UserIcon className="h-4 w-4" />
                    <span>My Account</span>
                  </a>
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              Welcome, {user.username}
            </span>
            <Separator orientation="vertical" className="h-6 bg-purple-700/30" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 bg-purple-700/30" />
            <div className="flex items-center gap-2">
              <ConnectionStatus isConnected={isConnected} isConnecting={isConnecting} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingIndicator size="lg" />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingIndicator size="lg" />;
  }

  if (!user || user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function App() {
  const [location] = useLocation();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <AnimatePresence mode="wait">
          <div key={location}>
            <Layout>
              <Switch>
                <Route path="/login" component={Login} />
                <Route path="/register" component={Register} />
                <Route path="/" component={() => <ProtectedRoute component={Monitor} />} />
                <Route path="/admin" component={() => <AdminRoute component={AdminPanel} />} />
                <Route path="/user" component={() => <ProtectedRoute component={UserPanel} />} />
                <Route component={NotFound} />
              </Switch>
            </Layout>
          </div>
        </AnimatePresence>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;