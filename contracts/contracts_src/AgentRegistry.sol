// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentRegistry
 * @notice Global registry for AI Agents (The "DMV for AI").
 *         Allows registration with a stake, trust score tracking, and funding.
 */
contract AgentRegistry {
    // ── State ──────────────────────────────────────────────────────────────────

    address public owner;
    bool public paused;

    uint256 public constant REGISTRATION_STAKE = 0.01 ether; // Minimum stake amount
    uint256 public constant DEFAULT_TRUST_SCORE = 50;
    uint256 public constant MAX_TRUST_SCORE = 100;

    struct Agent {
        address ownerWallet;
        uint256 trustScore;
        uint256 balance;
        bool isRegistered;
        bool isRevoked;
    }

    // agentId → Agent details
    mapping(string => Agent) public agents;
    // All registered agent IDs (for enumeration)
    string[] public agentIds;

    struct Report {
        address reporter;
        string proofHash;
        uint256 timestamp;
        uint8 penaltyPoints;
    }

    // agentId → Array of malicious behavior reports
    mapping(string => Report[]) public agentReports;

    // ── Events ─────────────────────────────────────────────────────────────────

    event AgentRegistered(string indexed agentId, address indexed ownerWallet, uint256 initialStake);
    event TrustScoreUpdated(string indexed agentId, uint256 oldScore, uint256 newScore);
    event FundsDeposited(string indexed agentId, uint256 amount, uint256 newBalance);
    event AgentRevoked(string indexed agentId);
    event Paused();
    event Unpaused();
    event MaliciousBehaviorReported(string indexed agentId, address indexed reporter, string proofHash, uint8 penaltyPoints);

    // ── Modifiers ──────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Registry is paused");
        _;
    }

    modifier validScore(uint256 score) {
        require(score <= MAX_TRUST_SCORE, "Score must be <= 100");
        _;
    }

    // ── Constructor ────────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ── Core Functions ─────────────────────────────────────────────────────────

    /**
     * @notice Register a new AI agent with an initial stake.
     * @param agentId The unique string identifier for the agent.
     */
    function registerAgent(string memory agentId) external payable whenNotPaused {
        require(bytes(agentId).length > 0, "Agent ID cannot be empty");
        require(!agents[agentId].isRegistered, "Agent already registered");
        require(msg.value >= REGISTRATION_STAKE, "Insufficient stake for registration");

        agents[agentId] = Agent({
            ownerWallet: msg.sender,
            trustScore: DEFAULT_TRUST_SCORE,
            balance: msg.value,
            isRegistered: true,
            isRevoked: false
        });
        
        agentIds.push(agentId);

        emit AgentRegistered(agentId, msg.sender, msg.value);
    }

    /**
     * @notice Deposit funds to an existing agent's wallet.
     * @param agentId The unique string identifier for the agent.
     */
    function depositFunds(string memory agentId) external payable whenNotPaused {
        require(agents[agentId].isRegistered, "Agent not registered");
        require(!agents[agentId].isRevoked, "Agent is revoked");
        require(msg.value > 0, "Deposit amount must be > 0");

        agents[agentId].balance += msg.value;

        emit FundsDeposited(agentId, msg.value, agents[agentId].balance);
    }

    /**
     * @notice Update an agent's trust score. Only the NeuralControl owner/oracle can call this.
     * @param agentId The unique string identifier for the agent.
     * @param newScore The new trust score (0-100).
     */
    function updateTrustScore(string memory agentId, uint256 newScore) 
        external 
        onlyOwner 
        validScore(newScore) 
    {
        require(agents[agentId].isRegistered, "Agent not registered");
        require(!agents[agentId].isRevoked, "Agent is revoked");

        uint256 oldScore = agents[agentId].trustScore;
        agents[agentId].trustScore = newScore;

        emit TrustScoreUpdated(agentId, oldScore, newScore);
    }

    /**
     * @notice Revoke an agent due to malicious behavior. Only the owner can call this.
     * @param agentId The unique string identifier for the agent.
     */
    function revokeAgent(string memory agentId) external onlyOwner {
        require(agents[agentId].isRegistered, "Agent not registered");
        require(!agents[agentId].isRevoked, "Agent already revoked");

        agents[agentId].isRevoked = true;
        agents[agentId].trustScore = 0;

        emit AgentRevoked(agentId);
        // Explicitly update trust score event for listeners tracking reputation only
        emit TrustScoreUpdated(agentId, agents[agentId].trustScore, 0);
    }

    /**
     * @notice Allows any third-party to report malicious behavior and slash an agent's score.
     * @param agentId The unique string identifier for the agent.
     * @param proofHash A hash or URI pointing to the proof of malicious behavior (e.g., logs).
     * @param penaltyPoints The amount of trust score to deduct (capped at 20 per report).
     */
    function reportMaliciousBehavior(string memory agentId, string memory proofHash, uint8 penaltyPoints) external whenNotPaused {
        require(agents[agentId].isRegistered, "Agent not registered");
        require(!agents[agentId].isRevoked, "Agent is revoked");
        require(penaltyPoints > 0 && penaltyPoints <= 20, "Penalty must be between 1 and 20");

        uint256 oldScore = agents[agentId].trustScore;
        uint256 newScore;

        if (oldScore > penaltyPoints) {
            newScore = oldScore - penaltyPoints;
        } else {
            newScore = 0;
        }

        agents[agentId].trustScore = newScore;

        agentReports[agentId].push(Report({
            reporter: msg.sender,
            proofHash: proofHash,
            timestamp: block.timestamp,
            penaltyPoints: penaltyPoints
        }));

        emit MaliciousBehaviorReported(agentId, msg.sender, proofHash, penaltyPoints);
        emit TrustScoreUpdated(agentId, oldScore, newScore);
    }

    // ── Admin Functions ────────────────────────────────────────────────────────

    function pause() external onlyOwner {
        paused = true;
        emit Paused();
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused();
    }

    // ── View Functions ─────────────────────────────────────────────────────────

    function getAgent(string memory agentId) external view returns (Agent memory) {
        return agents[agentId];
    }

    function totalAgents() external view returns (uint256) {
        return agentIds.length;
    }
}
