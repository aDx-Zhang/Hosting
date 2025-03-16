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
import { Loader2, Menu, Search, Bell, Settings, User as UserIcon } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

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
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="text-2xl font-bold">
                  Market Monitor
                </SheetTitle>
              </SheetHeader>

              <nav className="mt-8">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground px-2">
                      Main Navigation
                    </h4>
                    <div className="space-y-1">
                      <Link href="/">
                        <a className="flex items-center gap-3 w-full px-2 py-2 text-sm hover:bg-muted rounded-md transition-colors">
                          <Search className="h-4 w-4" />
                          Search Products
                        </a>
                      </Link>
                      <Link href="/monitor">
                        <a className="flex items-center gap-3 w-full px-2 py-2 text-sm hover:bg-muted rounded-md transition-colors">
                          <Bell className="h-4 w-4" />
                          Monitor Prices
                        </a>
                      </Link>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground px-2">
                      Account
                    </h4>
                    <div className="space-y-1">
                      {user?.role === 'admin' ? (
                        <Link href="/admin">
                          <a className="flex items-center gap-3 w-full px-2 py-2 text-sm hover:bg-muted rounded-md transition-colors">
                            <Settings className="h-4 w-4" />
                            Admin Panel
                          </a>
                        </Link>
                      ) : (
                        <Link href="/user">
                          <a className="flex items-center gap-3 w-full px-2 py-2 text-sm hover:bg-muted rounded-md transition-colors">
                            <UserIcon className="h-4 w-4" />
                            My Account
                          </a>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          <div className="text-sm text-muted-foreground">
            Welcome, {user.username}
          </div>
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