"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginSchema } from "@/schema/authSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { useLogin } from "@/hooks/useSignals";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function LoginPage() {
  const router = useRouter();
  const { mutate: login, isPending, isError, error, isSuccess } = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect to dashboard on successful login
  useEffect(() => {
    if (isSuccess) {
      router.push("/dashboard");
    }
  }, [isSuccess, router]);

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    login({
      email: data.email,
      password: data.password,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-background via-purple-950/5 to-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Enter your details to login</CardDescription>
        </CardHeader>

        <CardContent>
          {/* Error Alert */}
          {isError && error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
              <p className="text-sm text-red-500 font-medium">
                {error.message || "Login failed. Please try again."}
              </p>
            </div>
          )}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Field */}
            <FieldGroup>
              {/* Email Field */}
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Email Address</FieldLabel>
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      aria-invalid={fieldState.invalid}
                      autoComplete="email"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Password Field */}
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      {...field}
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      aria-invalid={fieldState.invalid}
                      autoComplete="new-password"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-200 mt-6"
                disabled={isPending}
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="size-4" />
                    Logging in...
                  </span>
                ) : (
                  "Login"
                )}
              </Button>
            </FieldGroup>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground font-medium">
                Or continue with
              </span>
            </div>
          </div>

          {/* Sign In Link */}
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Create an account?{" "}
              <Link
                href="/auth/signup"
                className="font-semibold text-violet-600 hover:text-violet-500 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
