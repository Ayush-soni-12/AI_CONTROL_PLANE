"use client";

import React, { useState } from "react";
import { ethers } from "ethers";
import { Wallet, Shield, CheckCircle, PlusCircle, AlertCircle } from "lucide-react";

// Placeholder Address: We will update this after deploying Phase 1
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ADDRESS || "0x29243AD8082F5f0CEdCa89ED85db662975E5d96A";


const ABI = [
  "function registerAgent(string memory agentId) external payable",
  "function depositFunds(string memory agentId) external payable",
  "function getAgent(string memory agentId) external view returns (tuple(address ownerWallet, uint256 trustScore, uint256 balance, bool isRegistered, bool isRevoked))"
];

export default function AgentRegistryPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [agentId, setAgentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Lookup state
  const [lookupId, setLookupId] = useState("");
  const [agentData, setAgentData] = useState<any>(null);

  const connectWallet = async () => {
    setError(null);
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setError("Please install MetaMask to use the Registry.");
      return;
    }

    try {
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      const signer = await browserProvider.getSigner();
      const address = await signer.getAddress();
      
      setWalletAddress(address);
      setProvider(browserProvider);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet.");
    }
  };

  const registerAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!provider || !walletAddress) {
      setError("Please connect your wallet first.");
      return;
    }

    if (!agentId.trim()) {
      setError("Agent ID cannot be empty.");
      return;
    }

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      // 0.01 AVAX stake required
      const tx = await contract.registerAgent(agentId, {
        value: ethers.parseEther("0.01"),
        gasLimit: 300000,
      });

      setSuccess("Transaction submitted! Waiting for confirmation...");
      await tx.wait();
      
      setSuccess(`Agent "${agentId}" registered successfully!`);
      setAgentId("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.reason || err.message || "Transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  const lookupAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAgentData(null);
    if (!lookupId.trim()) return;

    try {
      // Use public RPC if wallet is not connected
      const readProvider = provider || new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, readProvider);
      
      const data = await contract.getAgent(lookupId);
      
      setAgentData({
        ownerWallet: data[0],
        trustScore: data[1].toString(),
        balance: ethers.formatEther(data[2]),
        isRegistered: data[3],
        isRevoked: data[4],
      });
    } catch (err: any) {
      setError(err.reason || err.message || "Failed to lookup agent.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="text-blue-500" />
              Global Agent Registry
            </h1>
            <p className="text-gray-400 mt-2">
              The "DMV for AI" — Register your autonomous agent, fund its wallet, and build a Trust Score.
            </p>
          </div>
          
          <button
            onClick={connectWallet}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              walletAddress 
                ? "bg-green-500/10 text-green-500 border border-green-500/20"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            <Wallet size={20} />
            {walletAddress 
              ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`
              : "Connect Wallet"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Registration Form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <PlusCircle className="text-blue-500" size={24} />
              Register New Agent
            </h2>
            
            <form onSubmit={registerAgent} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Agent ID (Must be unique)
                </label>
                <input
                  type="text"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="e.g. agent_trading_bot_v1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-400 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Requires 0.01 AVAX stake to prevent spam.
                </p>
              </div>

              {error && (
                <div className="text-red-400 bg-red-400/10 border border-red-400/20 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-green-400 bg-green-400/10 border border-green-400/20 p-3 rounded-lg text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !walletAddress}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                {loading ? "Processing..." : "Register Agent"}
              </button>
            </form>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-medium mb-4">How it works</h3>
              <ol className="space-y-4 text-gray-400 text-sm list-decimal list-inside">
                <li><strong className="text-gray-200">Connect Wallet:</strong> Link your MetaMask wallet to the Avalanche Fuji Testnet.</li>
                <li><strong className="text-gray-200">Register:</strong> Claim a unique Agent ID and deposit a small stake.</li>
                <li><strong className="text-gray-200">Build Trust:</strong> The agent starts with a default Trust Score of 50. NeuralControl will adjust this based on its API behavior.</li>
                <li><strong className="text-gray-200">Bypass Limits:</strong> High-trust agents can use X-402 Agentic Payments to seamlessly bypass rate limits.</li>
              </ol>
            </div>

            {/* Lookup Panel */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Shield className="text-blue-500" size={20} />
                Check Agent Score
              </h3>
              
              <form onSubmit={lookupAgent} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  placeholder="Enter Agent ID (e.g. bot_2)"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Lookup
                </button>
              </form>

              {agentData && (
                <div className="bg-gray-800 rounded-lg p-4 space-y-3 text-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                    <span className="text-gray-400">Status</span>
                    {agentData.isRegistered ? (
                      <span className="text-green-400 font-medium flex items-center gap-1"><CheckCircle size={14}/> Registered</span>
                    ) : (
                      <span className="text-red-400 font-medium">Not Found</span>
                    )}
                  </div>
                  
                  {agentData.isRegistered && (
                    <>
                      <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                        <span className="text-gray-400">Trust Score</span>
                        <span className="text-white font-bold text-lg">{agentData.trustScore} / 100</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                        <span className="text-gray-400">Stake Balance</span>
                        <span className="text-white">{agentData.balance} AVAX</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-400">Owner Wallet</span>
                        <span className="text-xs text-gray-300 break-all bg-gray-900 p-2 rounded">{agentData.ownerWallet}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
