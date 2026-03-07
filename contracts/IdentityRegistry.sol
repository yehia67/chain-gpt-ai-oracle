// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract IdentityRegistry {
    event AgentRegistered(address indexed agent, string agentURI, address indexed registrar);

    error InvalidAgent();
    error UnauthorizedRegistrar();

    mapping(address => string) private agentUris;

    function registerAgent(address agentAddress, string calldata agentURI) external {
        if (agentAddress == address(0)) {
            revert InvalidAgent();
        }
        if (msg.sender != agentAddress) {
            revert UnauthorizedRegistrar();
        }

        agentUris[agentAddress] = agentURI;
        emit AgentRegistered(agentAddress, agentURI, msg.sender);
    }

    function getAgent(address agentAddress) external view returns (string memory agentURI) {
        return agentUris[agentAddress];
    }
}
