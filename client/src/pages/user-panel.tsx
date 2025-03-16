import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SubscriptionInfo {
  expiresAt: string;
  active: boolean;
}

export default function UserPanel() {
  const { user } = useAuth();

  // Redirect if not logged in
  if (!user) {
    return <Redirect to="/login" />;
  }

  const { data: subscription, isLoading } = useQuery<SubscriptionInfo>({
    queryKey: ['/api/auth/subscription'],
    staleTime: 1000 * 60, // 1 minute
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
                    'Your subscription has expired. Please contact an administrator.'
                  )}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No active subscription found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
