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
import { Loader2, Menu } from "lucide-react";
import { Redirect } from "wouter";
import Register from "@/pages/register";
import UserPanel from "@/pages/user-panel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  // Don't show navigation on login or register pages, or when user is not logged in
  if (location === "/login" || location === "/register" || !user) {
    return null;
  }

  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 hover:bg-gray-100 rounded-md">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-8">
                <div className="flex flex-col space-y-4">
                  <Link href="/">
                    <a className="text-primary hover:text-primary/80 py-2">Search</a>
                  </Link>
                  <Link href="/monitor">
                    <a className="text-primary hover:text-primary/80 py-2">Monitor</a>
                  </Link>
                  {user?.role === 'admin' ? (
                    <Link href="/admin">
                      <a className="text-primary hover:text-primary/80 py-2">Admin Panel</a>
                    </Link>
                  ) : (
                    <Link href="/user">
                      <a className="text-primary hover:text-primary/80 py-2">Account</a>
                    </Link>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>

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
    </header>
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
      <Route path="/register" component={Register} />
      <Route path="/" component={() => <ProtectedRoute component={Home} />} />
      <Route path="/monitor" component={() => <ProtectedRoute component={Monitor} />} />
      <Route path="/admin" component={() => <AdminRoute component={AdminPanel} />} />
      <Route path="/user" component={() => <ProtectedRoute component={UserPanel} />} />
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