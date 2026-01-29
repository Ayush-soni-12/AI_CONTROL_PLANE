"use client";

import { useCheckAuth } from "@/hooks/useSignals";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, LogIn } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DynamicServiceDetails } from "@/components/services/DynamicServiceDetails";

export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const serviceName = decodeURIComponent(params.serviceName as string);

  // Check authentication
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isAuthLoading, router]);

  // Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="text-center">
          <div className="inline-block p-4 rounded-2xl bg-purple-500/10 mb-4">
            <LogIn className="w-12 h-12 text-purple-400 animate-pulse" />
          </div>
          <p className="text-gray-400 text-lg">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show nothing (will redirect)
  if (!user) {
    return null;
  }

  return (
    <>
      <DashboardSidebar />
      <div className="lg:ml-64 min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="max-w-7xl mx-auto">
          {/* Static Back Button */}
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>

          {/* Dynamic Service Content - Wrapped in Suspense */}
          <Suspense
            fallback={
              <>
                <Skeleton className="h-12 w-96 mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton className="h-32 rounded-xl" key={i} />
                  ))}
                </div>
                <Skeleton className="h-96 rounded-xl" />
              </>
            }
          >
            <DynamicServiceDetails serviceName={serviceName} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
