import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Monitor from "@/pages/monitor";

function Navigation() {
  return (
    <nav className="bg-white border-b mb-4">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-6 h-14">
          <Link href="/">
            <a className="text-primary hover:text-primary/80">Search</a>
          </Link>
          <Link href="/monitor">
            <a className="text-primary hover:text-primary/80">Monitor</a>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/monitor" component={Monitor} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Navigation />
      <Router />
      <Toaster className="bottom-4 left-4" />
    </QueryClientProvider>
  );
}

export default App;