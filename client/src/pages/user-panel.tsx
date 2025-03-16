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
  key: string;
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

  if (!user) {
    return <Redirect to="/login" />;
  }

  const { data: subscription, isLoading } = useQuery<SubscriptionInfo>({
    queryKey: ['/api/auth/subscription'],
    staleTime: 1000 * 60,
  });

  const addKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      const response = await fetch('/api/auth/add-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to add API key');
      }

      return response.json();
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
      <div className="flex items-center justify-center min-h-screen bg-[#2a1f3d]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2a1f3d] relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full animate-gradient" />
      <div className="absolute inset-0 bg-grid-white/[0.02] -z-10" />

      <div className="container mx-auto py-8 px-4 relative z-10">
        <div className="grid gap-6 max-w-2xl mx-auto">
          {subscription ? (
            <div className="flex items-center justify-between p-4 bg-[#2a1f3d] rounded-lg border border-purple-700/30">
              <div className="flex items-center gap-3">
                {subscription.active ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <div className="font-medium text-white">
                    {subscription.active ? 'Active Key' : 'Expired Key'}
                  </div>
                  <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>Valid until: {new Date(subscription.expiresAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              {subscription.active && (
                <div className="text-2xl font-bold text-primary">
                  {formatTimeLeft(subscription.expiresAt)}
                  <span className="text-sm text-gray-400 ml-1">left</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-400 bg-[#2a1f3d] p-4 rounded-lg border border-purple-700/30">
              No active API key found. Enter your API key below to get started.
            </div>
          )}

          <Card className="bg-[#2a1f3d] border-purple-700/30">
            <CardHeader>
              <CardTitle>Extend Access Time</CardTitle>
              <CardDescription>
                Add a new API key to extend your access period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Enter API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-[#2a1f3d] border-purple-700/30"
                />
                <Button
                  onClick={() => apiKey && addKeyMutation.mutate(apiKey)}
                  disabled={addKeyMutation.isPending || !apiKey}
                  className="bg-primary hover:bg-primary/90"
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
    </div>
  );
}