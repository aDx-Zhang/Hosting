import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Calendar, CheckCircle2, XCircle, LogOut } from "lucide-react";
import { Redirect } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";

interface SubscriptionInfo {
  expiresAt: string;
  active: boolean;
}

function formatTimeLeft(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return 'Expired';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `${days} days`;
}

export default function UserPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");

  // Redirect if not logged in
  if (!user) {
    return <Redirect to="/login" />;
  }

  const { data: subscription, isLoading } = useQuery<SubscriptionInfo>({
    queryKey: ['/api/auth/subscription'],
    staleTime: 1000 * 60, // 1 minute
  });

  const addKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await fetch('/api/auth/add-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to add API key');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'API key added successfully',
      });
      setApiKey('');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/subscription'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Account Information</h1>
        <Button
          variant="outline"
          className="flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="grid gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Subscription Status</CardTitle>
            <CardDescription>
              Time remaining on your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    {subscription.active ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">
                        {subscription.active ? 'Active Subscription' : 'Expired Subscription'}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        <span>Expires: {new Date(subscription.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  {subscription.active && (
                    <div className="text-2xl font-bold text-primary">
                      {formatTimeLeft(subscription.expiresAt)}
                      <span className="text-sm text-muted-foreground ml-1">remaining</span>
                    </div>
                  )}
                </div>

                {!subscription.active && (
                  <div className="text-sm text-muted-foreground bg-destructive/5 p-4 rounded-lg border border-destructive/20">
                    Your subscription has expired. Please add a new API key below to continue using the service.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground bg-primary/5 p-4 rounded-lg border border-primary/20">
                No active subscription found. Add an API key below to get started.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activate Subscription</CardTitle>
            <CardDescription>
              Enter your API key to activate or extend your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="animate-input"
              />
              <Button
                onClick={() => apiKey && addKeyMutation.mutate(apiKey)}
                disabled={addKeyMutation.isPending || !apiKey}
                className="animate-button"
              >
                {addKeyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Key'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}