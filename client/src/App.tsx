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

function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();

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

  return (
    <header className="sticky top-0 z-50">
      <div className="w-full bg-[#2a1f3d]/95 backdrop-blur-sm border-b border-purple-700/30">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-primary">FlipX</h1>
            <nav className="flex items-center gap-4">
              <Link href="/">
                <a className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  location === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-accent"
                }`}>
                  <Bell className="h-4 w-4" />
                  <span>Price Monitors</span>
                </a>
              </Link>
              {user.role === 'admin' ? (
                <Link href="/admin">
                  <a className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                    location === "/admin" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-accent"
                  }`}>
                    <Settings className="h-4 w-4" />
                    <span>Admin Panel</span>
                  </a>
                </Link>
              ) : (
                <Link href="/user">
                  <a className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                    location === "/user" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-accent"
                  }`}>
                    <UserIcon className="h-4 w-4" />
                    <span>My Account</span>
                  </a>
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.username}
            </span>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
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