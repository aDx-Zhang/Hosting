import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Monitor from "@/pages/monitor";
import Login from "@/pages/login";
import AdminPanel from "@/pages/admin-panel";
import { useAuth } from "@/hooks/use-auth";
import { Bell, Settings, User as UserIcon, Menu } from "lucide-react";
import { Redirect } from "wouter";
import Register from "@/pages/register";
import UserPanel from "@/pages/user-panel";
import { Layout } from "@/components/layout";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { AnimatePresence } from "framer-motion";

function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  if (location === "/login" || location === "/register" || !user) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50">
      <div className="w-full bg-[#2a1f3d]/95 backdrop-blur-sm border-b border-purple-700/30">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <button className="p-2 hover:bg-accent rounded-md">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="text-2xl font-bold text-primary">
                    FlipX
                  </SheetTitle>
                </SheetHeader>

                <nav className="mt-8">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground px-2">
                        Monitoring
                      </h4>
                      <div className="space-y-1">
                        <Link href="/">
                          <a className="flex items-center gap-3 w-full px-2 py-2 text-sm hover:bg-accent rounded-md transition-colors">
                            <Bell className="h-4 w-4 text-primary" />
                            Price Monitors
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
                            <a className="flex items-center gap-3 w-full px-2 py-2 text-sm hover:bg-accent rounded-md transition-colors">
                              <Settings className="h-4 w-4 text-primary" />
                              Admin Panel
                            </a>
                          </Link>
                        ) : (
                          <Link href="/user">
                            <a className="flex items-center gap-3 w-full px-2 py-2 text-sm hover:bg-accent rounded-md transition-colors">
                              <UserIcon className="h-4 w-4 text-primary" />
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
            <h1 className="text-xl font-bold text-primary">FlipX</h1>
          </div>

          <div className="text-sm text-muted-foreground">
            Welcome, {user.username}
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