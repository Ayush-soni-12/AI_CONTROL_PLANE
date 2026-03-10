import { Zap } from "lucide-react";

export function AdaptiveTimeoutUsage() {
  return (
    <div className="rounded-2xl bg-gray-900/40 border border-gray-800/50 p-6">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-purple-400" />
        SDK Usage (zero config needed)
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs text-gray-400">
        <div className="min-w-0">
          <p className="text-gray-300 font-semibold mb-2">Express Endpoints</p>
          <pre className="bg-gray-950 rounded-xl p-4 text-green-400 overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">{`// Protect the entire route
app.get('/products', 
  controlPlane.withEndpointTimeout(
    '/products', 
    async (req, res) => {
      // 504 Timeout on slow responses
    }
  )
);`}</pre>
        </div>
        <div className="min-w-0">
          <p className="text-gray-300 font-semibold mb-2">External API calls</p>
          <pre className="bg-gray-950 rounded-xl p-4 text-green-400 overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">{`// Granular API protection
const res = await controlPlane.adaptiveFetch(
  '/payments/gateway',
  'https://payment-api/charge',
  { method: 'POST', body: data }
);`}</pre>
        </div>
        <div className="min-w-0">
          <p className="text-gray-300 font-semibold mb-2">Database calls</p>
          <pre className="bg-gray-950 rounded-xl p-4 text-green-400 overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">{`// Wrap any ORM call
const users = await controlPlane.withDbTimeout(
  '/db/users',
  () => prisma.user.findMany()
);`}</pre>
        </div>
      </div>
    </div>
  );
}
