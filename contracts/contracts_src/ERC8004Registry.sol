// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ERC8004Registry
 * @notice On-chain identity and reputation registry for AI agents.
 *         Deployed on Avalanche Fuji C-Chain Testnet.
 *
 * @dev This contract implements the core concept of ERC-8004:
 *      - Every AI agent gets an on-chain identity (agentId string)
 *      - The registry owner assigns a reputation score (0-100)
 *      - Anyone can read a score — NeuralControl calls getScore()
 *        before deciding whether to offer an agent the x402 payment option
 *
 * SCORE MEANING:
 *   0  - 29  : Unknown / Blacklisted — hard block (no payment offer)
 *   30 - 59  : Low reputation — block (risky, unproven agent)
 *   60 - 84  : Trusted agent — offer x402 payment bypass
 *   85 - 100 : Verified / Premium agent — offer x402 + priority treatment
 *
 * HOW NEURALCONTROL USES THIS:
 *   1. Agent sends request with header: x-agent-id: agent_good_market_v1
 *   2. NeuralControl calls: registry.getScore("agent_good_market_v1")
 *   3. If score >= 60 → offer 402 Payment Required invoice
 *   4. If score < 60  → return hard 429 (no payment option)
 */
contract ERC8004Registry {

    // ── State ──────────────────────────────────────────────────────────────────

    address public owner;

    // agentId → reputation score (0-100)
    mapping(string => uint256) private _scores;

    // agentId → whether this agent is registered at all
    mapping(string => bool) private _registered;

    // All registered agent IDs (for enumeration / dashboard display)
    string[] private _agentIds;


    // ── Events ─────────────────────────────────────────────────────────────────

    // Emitted when a new agent is registered
    event AgentRegistered(string indexed agentId, uint256 score, address registeredBy);

    // Emitted when an agent's score is updated
    event ScoreUpdated(string indexed agentId, uint256 oldScore, uint256 newScore);

    // Emitted when an agent is blacklisted (score set to 0)
    event AgentBlacklisted(string indexed agentId);


    // ── Constructor ────────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }


    // ── Modifiers ──────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "ERC8004: caller is not the owner");
        _;
    }

    modifier validScore(uint256 score) {
        require(score <= 100, "ERC8004: score must be between 0 and 100");
        _;
    }


    // ── Write Functions (only owner) ───────────────────────────────────────────

    /**
     * @notice Register a new AI agent with an initial reputation score.
     * @param agentId  The agent's unique string identifier (e.g. "agent_good_market_v1")
     * @param score    Initial reputation score (0-100)
     */
    function registerAgent(string memory agentId, uint256 score)
        external
        onlyOwner
        validScore(score)
    {
        require(!_registered[agentId], "ERC8004: agent already registered");

        _registered[agentId] = true;
        _scores[agentId] = score;
        _agentIds.push(agentId);

        emit AgentRegistered(agentId, score, msg.sender);
    }

    /**
     * @notice Update an existing agent's reputation score.
     * @param agentId  The agent's unique identifier
     * @param newScore New reputation score (0-100)
     */
    function updateScore(string memory agentId, uint256 newScore)
        external
        onlyOwner
        validScore(newScore)
    {
        require(_registered[agentId], "ERC8004: agent not registered");

        uint256 oldScore = _scores[agentId];
        _scores[agentId] = newScore;

        emit ScoreUpdated(agentId, oldScore, newScore);
    }

    /**
     * @notice Blacklist a malicious agent (set score to 0).
     *         NeuralControl will then hard-block them with 429.
     * @param agentId  The agent to blacklist
     */
    function blacklistAgent(string memory agentId) external onlyOwner {
        require(_registered[agentId], "ERC8004: agent not registered");
        _scores[agentId] = 0;
        emit AgentBlacklisted(agentId);
    }


    // ── Read Functions (public — anyone can call) ──────────────────────────────

    /**
     * @notice Get an agent's current reputation score.
     *         This is the main function NeuralControl calls.
     * @param agentId  The agent's unique identifier
     * @return score   0-100 reputation score. Returns 0 if not registered.
     */
    function getScore(string memory agentId) external view returns (uint256) {
        return _scores[agentId];
    }

    /**
     * @notice Check if an agent is registered in this registry.
     * @param agentId  The agent's unique identifier
     * @return True if registered, false if unknown
     */
    function isRegistered(string memory agentId) external view returns (bool) {
        return _registered[agentId];
    }

    /**
     * @notice Get full agent info in one call.
     * @param agentId  The agent's unique identifier
     * @return score       Reputation score (0-100)
     * @return registered  Whether the agent is registered
     * @return trusted     Whether NeuralControl should offer payment (score >= 60)
     */
    function getAgentInfo(string memory agentId)
        external
        view
        returns (uint256 score, bool registered, bool trusted)
    {
        score = _scores[agentId];
        registered = _registered[agentId];
        trusted = registered && score >= 60;
    }

    /**
     * @notice Get total number of registered agents.
     */
    function totalAgents() external view returns (uint256) {
        return _agentIds.length;
    }
}
