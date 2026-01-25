"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signupSchema } from "@/schema/authSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { useSignup } from "@/hooks/useSignals";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function SignupPage() {
  const router = useRouter();
  const { mutate: signup, isPending, isError, error, isSuccess } = useSignup();

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Redirect to dashboard on successful signup
  useEffect(() => {
    if (isSuccess) {
      router.push("/dashboard");
    }
  }, [isSuccess, router]);

  const onSubmit = async (data: z.infer<typeof signupSchema>) => {
    signup({
      name: data.name,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-background via-purple-950/5 to-background">
      <Card className="w-full max-w-md shadow-2xl border-white/10">
        <CardHeader className="text-center space-y-3 pb-8">
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">
              Create Account
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Sign up to get started with your account
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Alert */}
          {isError && error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-500 font-medium">
                {error.message || "Signup failed. Please try again."}
              </p>
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Name Field */}
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="name" className="text-sm font-medium">
                    Full Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    aria-invalid={fieldState.invalid}
                    className="h-11"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Email Field */}
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </FieldLabel>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    aria-invalid={fieldState.invalid}
                    autoComplete="email"
                    className="h-11"
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
                  <FieldLabel
                    htmlFor="password"
                    className="text-sm font-medium"
                  >
                    Password
                  </FieldLabel>
                  <Input
                    {...field}
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    aria-invalid={fieldState.invalid}
                    autoComplete="new-password"
                    className="h-11"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Confirm Password Field */}
            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel
                    htmlFor="confirmPassword"
                    className="text-sm font-medium"
                  >
                    Confirm Password
                  </FieldLabel>
                  <Input
                    {...field}
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    aria-invalid={fieldState.invalid}
                    autoComplete="new-password"
                    className="h-11"
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
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </Button>
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
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-semibold text-violet-600 hover:text-violet-500 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SignupPage;
