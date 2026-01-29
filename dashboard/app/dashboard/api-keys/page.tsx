"use client";

import { useGenerateApiKey } from "@/hooks/useApiKeys";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DynamicApiKeys } from "@/components/dashboard/DynamicApiKeys";
import { Suspense, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
// import dynamic from "next/dynamic";
import { useCheckAuth } from "@/hooks/useSignals";
import { useRouter } from "next/navigation";

// const DynamicApiKeys = dynamic(
//   () =>
//     import("@/components/dashboard/DynamicApiKeys").then(
//       (mod) => mod.DynamicApiKeys,
//     ),
//   {
//     ssr: false,
//     loading: () => (
//       <div className="space-y-4">
//         {[...Array(3)].map((_, i) => (
//           <Skeleton className="h-24 w-full rounded-xl" key={i} />
//         ))}
//       </div>
//     ),
//   },
// );

export default function ApiKeysPage() {
  const { mutate: generateKey, isPending: isGenerating } = useGenerateApiKey();

    const { data: user, isLoading: isAuthLoading } = useCheckAuth();
    const router = useRouter();


  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isAuthLoading, router]);


    if (!user) {
    return null;
  }

  const generateNewKey = () => {
    generateKey("", {
      onSuccess: (data) => {
        if (data && data.api_key) {
          alert(data.message || "API key generated successfully!");
        } else {
          alert("Failed to generate API key. Please try again.");
        }
      },
      onError: () => {
        alert("An error occurred while generating the API key.");
      },
    });
  };

  return (
    <>
      <DashboardSidebar />
      <div className="lg:ml-64 min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  API Keys
                </h1>
                <p className="text-gray-400 mt-2">
                  Manage your API keys for accessing the Control Plane
                </p>
              </div>
              <Button
                onClick={() => generateNewKey()}
                disabled={isGenerating}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Generate New Key
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* API Keys List - Wrapped in Suspense */}
          <Suspense
            fallback={
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton className="h-24 w-full rounded-xl" key={i} />
                ))}
              </div>
            }
          >
            <DynamicApiKeys />
          </Suspense>

          {/* Info Box */}
          <div className="mt-8 p-6 bg-blue-900/20 border border-blue-500/30 rounded-xl">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">
              How to use API Keys
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Include your API key in the request headers:
            </p>
            <code className="block bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-3 text-sm font-mono text-gray-300">
              curl -H &quot;Authorization: Bearer YOUR_API_KEY&quot;
              https://api.example.com/signals
            </code>
          </div>
        </div>
      </div>
    </>
  );
}
