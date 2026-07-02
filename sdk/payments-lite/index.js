const { ethers } = require('ethers');

const REGISTRY_ABI = [
    "function getAgent(string agentId) view returns (tuple(address ownerWallet, uint256 trustScore, uint256 balance, bool isRegistered, bool isRevoked))",
    "function updateTrustScore(string agentId, uint256 newScore)"
];

// The default NeuralControl Global Agent Registry on Avalanche Fuji
const DEFAULT_REGISTRY_ADDRESS = '0x29243AD8082F5f0CEdCa89ED85db662975E5d96A';

/**
 * Verifies an Avalanche transaction on-chain for AI Agent Payments.
 * 
 * @param {string} txHash - The transaction hash provided by the AI Agent.
 * @param {string} expectedRecipient - The wallet address you expect to receive the funds.
 * @param {string|number|bigint} minAmountWei - The minimum amount of wei expected.
 * @param {string} [rpcUrl] - Optional RPC URL. Defaults to Avalanche Fuji Testnet.
 * @returns {Promise<{verified: boolean, amount_avax: number, reason?: string}>}
 */
async function verifyOnChain(txHash, expectedRecipient, minAmountWei, rpcUrl = 'https://api.avax-test.network/ext/bc/C/rpc') {
    try {
        if (!txHash || !txHash.startsWith('0x')) {
            return { verified: false, amount_avax: 0, reason: "Invalid transaction hash format" };
        }

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Wait for up to 3 seconds for the transaction to be indexed by the RPC
        let tx = null;
        for (let i = 0; i < 3; i++) {
            tx = await provider.getTransaction(txHash);
            if (tx) break;
            await new Promise(r => setTimeout(r, 1000));
        }

        if (!tx) {
            return { verified: false, amount_avax: 0, reason: "Transaction not found on chain" };
        }

        // 1. Check Recipient
        if (!tx.to || tx.to.toLowerCase() !== expectedRecipient.toLowerCase()) {
            return { 
                verified: false, 
                amount_avax: parseFloat(ethers.formatEther(tx.value)), 
                reason: "Payment sent to wrong wallet address" 
            };
        }

        // 2. Check Amount
        const amountPaidWei = BigInt(tx.value);
        const expectedWei = BigInt(minAmountWei);
        if (amountPaidWei < expectedWei) {
            return { 
                verified: false, 
                amount_avax: parseFloat(ethers.formatEther(tx.value)), 
                reason: "Payment amount too low" 
            };
        }

        // 3. Check Confirmation Status (ensure it didn't revert)
        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) {
            return { verified: false, amount_avax: parseFloat(ethers.formatEther(tx.value)), reason: "Transaction still pending" };
        }

        if (receipt.status === 0) {
            return { verified: false, amount_avax: parseFloat(ethers.formatEther(tx.value)), reason: "Transaction reverted/failed on chain" };
        }

        return {
            verified: true,
            amount_avax: parseFloat(ethers.formatEther(tx.value)),
            reason: "Success"
        };

    } catch (err) {
        return {
            verified: false,
            amount_avax: 0,
            reason: `RPC verification error: ${err.message}`
        };
    }
}

/**
 * Fetches the global reputation score of an AI Agent from the blockchain.
 * 
 * @param {string} agentId - The ID of the agent (e.g. 'agent_good_weather_bot_v1')
 * @param {string} [contractAddress] - The NeuralControl Registry address
 * @param {string} [rpcUrl] - Avalanche RPC URL
 * @returns {Promise<number|null>} - The score (0-100) or null if unregistered
 */
async function getAgentScore(
    agentId, 
    contractAddress = DEFAULT_REGISTRY_ADDRESS, 
    rpcUrl = 'https://api.avax-test.network/ext/bc/C/rpc'
) {
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, REGISTRY_ABI, provider);
        
        const agent = await contract.getAgent(agentId);
        if (!agent.isRegistered) return null;
        
        return Number(agent.trustScore);
    } catch (err) {
        console.error("Error fetching agent score:", err.message);
        return null;
    }
}

/**
 * Reports an agent for malicious behavior, cryptographically slashing their global reputation.
 * 
 * @param {string} agentId - The ID of the malicious agent
 * @param {string} proofString - A hash or description of the attack (e.g. 'SQL Injection detected in logs')
 * @param {number} penaltyPoints - How many points to deduct (1-20)
 * @param {string} websitePrivateKey - Your website's wallet private key (to sign the report)
 * @param {string} [contractAddress] - The NeuralControl Registry address
 * @param {string} [rpcUrl] - Avalanche RPC URL
 * @returns {Promise<{success: boolean, txHash?: string, error?: string}>}
 */
async function slashAgentScore(
    agentId, 
    proofString, 
    penaltyPoints, 
    websitePrivateKey,
    contractAddress = DEFAULT_REGISTRY_ADDRESS, 
    rpcUrl = 'https://api.avax-test.network/ext/bc/C/rpc'
) {
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(websitePrivateKey, provider);
        const contract = new ethers.Contract(contractAddress, REGISTRY_ABI, wallet);
        
        // Fetch current score first
        const agent = await contract.getAgent(agentId);
        let currentScore = Number(agent.trustScore);
        
        let newScore = currentScore > penaltyPoints ? currentScore - penaltyPoints : 0;
        
        const tx = await contract.updateTrustScore(agentId, newScore);
        await tx.wait(); // Wait for confirmation
        
        return { success: true, txHash: tx.hash };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = {
    verifyOnChain,
    getAgentScore,
    slashAgentScore
};
