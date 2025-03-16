import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Account Information</h1>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div>
                <div className="text-2xl font-bold mb-2">
                  {subscription.active ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-600">Expired</span>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {subscription.active ? (
                    <>Expires: {new Date(subscription.expiresAt).toLocaleDateString()}</>
                  ) : (
                    'Your subscription has expired. Please add a new API key below.'
                  )}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No active subscription found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add API Key</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button
                onClick={() => apiKey && addKeyMutation.mutate(apiKey)}
                disabled={addKeyMutation.isPending || !apiKey}
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