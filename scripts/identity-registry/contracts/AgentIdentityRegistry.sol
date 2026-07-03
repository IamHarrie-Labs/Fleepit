// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * ERC-8004 (Trustless Agents) compatible Identity Registry.
 *
 * The official reference implementation at github.com/erc-8004/erc-8004-contracts
 * is an upgradeable UUPS proxy whose initialize() takes a reinitializer(2) path —
 * it expects to be upgraded from an existing v1 deployment, not deployed fresh.
 * Calling it standalone would leave Ownable's owner permanently unset, since
 * initialize() is gated by onlyOwner but nothing ever sets that owner first.
 *
 * Mantle has no existing ERC-8004 deployment to upgrade from, so this is a
 * plain, non-upgradeable ERC-721 + URIStorage registry instead: same
 * register(agentURI) / Registered event / tokenURI shape the standard
 * requires, without the proxy and wallet-reassignment extras that only make
 * sense for the official multi-chain rollout.
 */
contract AgentIdentityRegistry is ERC721URIStorage {
    uint256 private _lastId;

    // agentId => the wallet that registered it, exposed the same way the
    // reference registry's getAgentWallet() does.
    mapping(uint256 => address) public agentWallet;

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);

    constructor() ERC721("AgentIdentity", "AGENT") {}

    function register(string memory agentURI) external returns (uint256 agentId) {
        agentId = _lastId++;
        agentWallet[agentId] = msg.sender;
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);
        emit Registered(agentId, agentURI, msg.sender);
    }

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        address owner = ownerOf(agentId);
        require(
            msg.sender == owner || isApprovedForAll(owner, msg.sender) || msg.sender == getApproved(agentId),
            "Not authorized"
        );
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        return agentWallet[agentId];
    }
}
