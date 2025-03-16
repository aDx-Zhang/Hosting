import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { Redirect } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { User, ApiKey } from "@shared/schema";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDuration, setSelectedDuration] = useState<string>();

  // Redirect non-admin users
  if (user && user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  const { data: monitors, isLoading } = useQuery({
    queryKey: ['/api/monitors'],
    staleTime: 1000 * 60, // 1 minute
  });

  const { data: users, isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ['/api/auth/users'],
    staleTime: 1000 * 60, // 1 minute
  });

  const { data: apiKeys, isLoading: loadingKeys } = useQuery<ApiKey[]>({
    queryKey: ['/api/auth/api-keys'],
    staleTime: 1000 * 60, // 1 minute
  });

  const generateKeyMutation = useMutation({
    mutationFn: async (days: number) => {
      const response = await fetch('/api/auth/generate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationDays: days })
      });
      if (!response.ok) throw new Error('Failed to generate key');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'API Key Generated',
        description: `New key: ${data.key}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/api-keys'] });
      setSelectedDuration(undefined); // Reset selection
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to generate API key',
        variant: 'destructive',
      });
    }
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      const response = await fetch(`/api/auth/api-keys/${keyId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete key');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'API key deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/api-keys'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete API key',
        variant: 'destructive',
      });
    }
  });

  if (isLoading || loadingUsers || loadingKeys) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Admin Panel</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Monitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{monitors?.length || 0}</div>
            <p className="text-muted-foreground">Total active product monitors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registered Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{users?.length || 0}</div>
            <p className="text-muted-foreground">Total registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{apiKeys?.filter(k => k.active)?.length || 0}</div>
            <p className="text-muted-foreground">Valid subscription keys</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Generate API Key</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Select 
                value={selectedDuration}
                onValueChange={setSelectedDuration}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                  <SelectItem value="365">1 Year</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={() => {
                  if (!selectedDuration) {
                    toast({
                      title: 'Select Duration',
                      description: 'Please select a duration first',
                    });
                    return;
                  }
                  generateKeyMutation.mutate(parseInt(selectedDuration));
                }}
                disabled={generateKeyMutation.isPending}
              >
                {generateKeyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Key'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Key</th>
                    <th className="text-left p-4">Created</th>
                    <th className="text-left p-4">Expires</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys?.map((key) => (
                    <tr key={key.id} className="border-b">
                      <td className="p-4 font-mono">{key.key}</td>
                      <td className="p-4">
                        {new Date(key.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Not activated'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          key.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {key.active ? (key.userId ? 'Used' : 'Available') : 'Expired'}
                        </span>
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteKeyMutation.mutate(key.id)}
                          disabled={deleteKeyMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Username</th>
                    <th className="text-left p-4">Role</th>
                    <th className="text-left p-4">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="p-4">{user.username}</td>
                      <td className="p-4">{user.role}</td>
                      <td className="p-4">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}