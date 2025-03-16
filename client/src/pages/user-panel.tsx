import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Calendar, CheckCircle2, XCircle } from "lucide-react";
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
  return `${days} days remaining`;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8">Account Information</h1>

      <div className="grid gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Subscription Status</CardTitle>
            <CardDescription>
              Your current subscription information and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {subscription.active ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`text-lg font-medium ${subscription.active ? 'text-green-500' : 'text-red-500'}`}>
                    {subscription.active ? 'Active' : 'Expired'}
                  </span>
                </div>

                <div className="bg-card/50 rounded-lg p-4 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Expires: {new Date(subscription.expiresAt).toLocaleDateString()} 
                      ({formatTimeLeft(subscription.expiresAt)})
                    </span>
                  </div>
                </div>

                {!subscription.active && (
                  <div className="text-sm text-muted-foreground mt-2">
                    Your subscription has expired. Please add a new API key below to continue using the service.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">
                No active subscription found. Add an API key below to get started.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add API Key</CardTitle>
            <CardDescription>
              Enter a valid API key to activate or extend your subscription
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