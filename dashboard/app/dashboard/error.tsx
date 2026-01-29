"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error using your preferred logging service
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 rounded-full bg-red-500/10 mb-6 border border-red-500/20">
        <AlertTriangle className="w-12 h-12 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">
        Something went wrong!
      </h2>
      <p className="text-gray-400 mb-8 max-w-md">
        {error.message ||
          "An unexpected error occurred while loading this page."}
      </p>
      <Button
        onClick={() => reset()}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
      >
        <RefreshCcw className="w-4 h-4" />
        Try again
      </Button>
    </div>
  );
}
