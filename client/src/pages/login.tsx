import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: { username: string; password: string }) => {
    try {
      setIsLoading(true);
      console.log('Submitting login form with username:', values.username);
      console.log('Password length:', values.password.length);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Success",
          description: "Logged in successfully",
        });
        setLocation("/");
      } else {
        console.error('Login failed:', data.error);
        toast({
          title: "Error",
          description: data.error || "Failed to login. Please check your credentials.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 w-full h-full bg-background" aria-hidden="true">
        <div className="absolute inset-0 w-full h-full opacity-50 animate-gradient bg-[length:200%_200%] bg-gradient-to-r from-primary/20 via-primary/5 to-background"></div>
        <div className="absolute inset-0 w-full h-full opacity-30">
          <div className="absolute inset-0 rotate-45 blur-3xl bg-gradient-to-r from-primary/30 via-primary/10 to-transparent transform-gpu animate-pulse"></div>
        </div>
      </div>

      <Card className="w-full max-w-md bg-card/30 backdrop-blur-xl border-border/50 relative z-10">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex justify-center">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary/80 to-primary">
              FlipX
            </h1>
          </div>
          <CardTitle className="text-xl text-center text-foreground/80">
            Sign in to your account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your username" 
                        className="bg-background/50 border-border/50"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        className="bg-background/50 border-border/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>

              <p className="text-sm text-center text-muted-foreground pt-4">
                Don't have an account?{" "}
                <Link href="/register">
                  <a className="text-primary hover:text-primary/90 hover:underline transition-colors">
                    Create an account
                  </a>
                </Link>
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}