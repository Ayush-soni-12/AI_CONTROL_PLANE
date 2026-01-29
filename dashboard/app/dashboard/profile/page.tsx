"use client";

import { Suspense, useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DynamicProfileContent } from "@/components/dashboard/DynamicProfileContent";
import { Skeleton } from "@/components/ui/skeleton";
import {  User } from "lucide-react";
// import dynamic from "next/dynamic";
import { useCheckAuth } from "@/hooks/useSignals";
import { useRouter } from "next/navigation";

// const DynamicProfileContent = dynamic(
//   () =>
//     import("@/components/dashboard/DynamicProfileContent").then(
//       (mod) => mod.DynamicProfileContent,
//     ),
//   { ssr: false, 
//     loading:()=>(
//                     <div className="space-y-6">
//                 <div className="flex items-center gap-6 p-6 rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm">
//                   <Skeleton className="w-24 h-24 rounded-full" />
//                   <div className="space-y-3">
//                     <Skeleton className="h-8 w-64" />
//                     <Skeleton className="h-5 w-48" />
//                   </div>
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   <Skeleton className="h-48 rounded-2xl" />
//                   <Skeleton className="h-48 rounded-2xl" />
//                 </div>
//               </div>
//     )
//   },
// );

export default function ProfilePage() {  
  
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


  return (
    <>
      <DashboardSidebar />
      <div className="lg:ml-64 min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <User className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  User Profile
                </h1>
                <p className="text-gray-400">
                  Manage your personal information and account settings
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Profile Section */}
          <Suspense
            fallback={
              <div className="space-y-6">
                <div className="flex items-center gap-6 p-6 rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                  <Skeleton className="w-24 h-24 rounded-full" />
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-5 w-48" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Skeleton className="h-48 rounded-2xl" />
                  <Skeleton className="h-48 rounded-2xl" />
                </div>
              </div>
            }
          >
            <DynamicProfileContent />
          </Suspense>
        </div>
      </div>
    </>
  );
}
