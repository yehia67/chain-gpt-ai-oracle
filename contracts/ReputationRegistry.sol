// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ReputationRegistry {
    struct FeedbackEntry {
        address client;
        string feedbackURI;
        uint64 timestamp;
    }

    event FeedbackSubmitted(address indexed client, address indexed server, string feedbackURI, uint64 timestamp);

    error InvalidAddress();
    error UnauthorizedClient();

    mapping(address => FeedbackEntry[]) private feedbackByServer;

    function submitFeedback(address client, address server, string calldata feedbackURI) external {
        if (client == address(0) || server == address(0)) {
            revert InvalidAddress();
        }

        if (msg.sender != client) {
            revert UnauthorizedClient();
        }

        feedbackByServer[server].push(
            FeedbackEntry({
                client: client,
                feedbackURI: feedbackURI,
                timestamp: uint64(block.timestamp)
            })
        );

        emit FeedbackSubmitted(client, server, feedbackURI, uint64(block.timestamp));
    }

    function getFeedback(address server) external view returns (string[] memory feedbackURIs) {
        FeedbackEntry[] storage entries = feedbackByServer[server];
        feedbackURIs = new string[](entries.length);

        for (uint256 i = 0; i < entries.length; i++) {
            feedbackURIs[i] = entries[i].feedbackURI;
        }
    }

    function getFeedbackDetailed(address server) external view returns (FeedbackEntry[] memory entries) {
        return feedbackByServer[server];
    }
}
