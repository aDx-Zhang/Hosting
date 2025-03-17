import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Trash2, Eye, EyeOff, LogOut, Plus } from "lucide-react";
import { Redirect } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { User, ApiKey, InsertProduct } from "@shared/schema";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDuration, setSelectedDuration] = useState<string>();
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});

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

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/users'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  });

  const togglePasswordVisibility = (userId: number) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  if (isLoading || loadingUsers || loadingKeys) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Admin Panel</h1>
        <Button
          variant="outline"
          className="flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => {
            fetch("/api/auth/logout", { method: "POST" })
              .then(() => window.location.href = "/login");
          }}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

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
                    <th className="text-left p-4">Duration</th>
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
                        {key.durationDays} {key.durationDays === 1 ? 'day' : 'days'}
                      </td>
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
                    <th className="text-left p-4">Password</th>
                    <th className="text-left p-4">IP Address</th>
                    <th className="text-left p-4">Role</th>
                    <th className="text-left p-4">Created At</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="p-4">{user.username}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span>
                            {visiblePasswords[user.id] ? user.rawPassword || user.password : '••••••••'}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePasswordVisibility(user.id)}
                          >
                            {visiblePasswords[user.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                      <td className="p-4">{user.ipAddress || 'N/A'}</td>
                      <td className="p-4">{user.role}</td>
                      <td className="p-4">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        {user.role !== 'admin' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the user account and all associated data.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUserMutation.mutate(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
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
            <CardTitle>Add Test Product</CardTitle>
            <CardDescription>
              Add a test product to see how it appears in the monitoring view
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const product: InsertProduct = {
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                price: formData.get('price') as string,
                image: formData.get('image') as string,
                marketplace: formData.get('marketplace') as string,
                originalUrl: formData.get('originalUrl') as string,
                foundAt: new Date()
              };

              try {
                await apiRequest("POST", "/api/products/test", product);
                toast({
                  title: "Success",
                  description: "Test product added successfully",
                });
                // Refresh the monitors to show the new product
                queryClient.invalidateQueries({ queryKey: ['/api/monitors'] });
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to add test product",
                  variant: "destructive",
                });
              }
            }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    name="title"
                    placeholder="Product title"
                    defaultValue="iPhone 13 Pro Max - Like New"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price (PLN)</label>
                  <Input
                    name="price"
                    placeholder="999.99"
                    defaultValue="999.99"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  name="description"
                  placeholder="Product description"
                  defaultValue="iPhone 13 Pro Max 256GB in perfect condition, includes original accessories and box."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Image URL</label>
                  <Input
                    name="image"
                    placeholder="https://example.com/image.jpg"
                    defaultValue="https://images.unsplash.com/photo-1592286927505-1def25115558"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Original URL</label>
                  <Input
                    name="originalUrl"
                    placeholder="https://marketplace.com/product"
                    defaultValue="https://allegro.pl/iphone-13"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Marketplace</label>
                <Select name="marketplace" defaultValue="allegro">
                  <SelectTrigger>
                    <SelectValue placeholder="Select marketplace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allegro">Allegro</SelectItem>
                    <SelectItem value="olx">OLX</SelectItem>
                    <SelectItem value="vinted">Vinted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Test Product
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}