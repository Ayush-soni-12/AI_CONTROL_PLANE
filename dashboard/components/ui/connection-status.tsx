import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import type { SSEStatus } from "@/hooks/useSSE";

interface ConnectionStatusProps {
  status: SSEStatus;
  onReconnect?: () => void;
}

/**
 * Visual indicator for SSE connection status
 *
 * Shows users when real-time updates are active, reconnecting, or disconnected.
 * Provides manual reconnect option when connection is lost.
 */
export function ConnectionStatus({
  status,
  onReconnect,
}: ConnectionStatusProps) {
  if (status === "connected") {
    return (
      <Badge
        variant="outline"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border-green-500/30 text-green-400"
      >
        <Wifi className="w-4 h-4 animate-pulse" />
        <span className="text-sm font-medium">Live</span>
      </Badge>
    );
  }

  if (status === "connecting") {
    return (
      <Badge
        variant="outline"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
      >
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">Connecting...</span>
      </Badge>
    );
  }

  if (status === "error" || status === "disconnected") {
    return (
      <Badge
        variant="outline"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border-red-500/30 text-red-400 cursor-pointer hover:bg-red-500/20 transition-colors"
        onClick={onReconnect}
      >
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">
          {status === "error" ? "Reconnecting..." : "Disconnected"}
        </span>
        {status === "disconnected" && onReconnect && (
          <RefreshCw className="w-3 h-3 ml-1" />
        )}
      </Badge>
    );
  }

  return null;
}
