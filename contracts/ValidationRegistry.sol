// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ValidationRegistry {
    struct ValidationRequest {
        address requester;
        address server;
        bytes32 dataHash;
        string validationType;
        bool exists;
    }

    struct ValidationResult {
        bool responded;
        bool verified;
        address validator;
        string proofURI;
        uint64 timestamp;
    }

    event ValidationRequested(
        uint256 indexed requestId,
        address indexed requester,
        address indexed server,
        bytes32 dataHash,
        string validationType
    );

    event ValidationResponded(
        uint256 indexed requestId,
        address indexed validator,
        bool verified,
        string proofURI
    );

    error InvalidValidator();
    error InvalidServer();
    error UnknownRequest();
    error AlreadyResponded();

    address public immutable authorizedValidator;
    uint256 public nextRequestId = 1;

    mapping(uint256 => ValidationRequest) private requests;
    mapping(uint256 => ValidationResult) private results;

    constructor(address validator_) {
        if (validator_ == address(0)) {
            revert InvalidValidator();
        }

        authorizedValidator = validator_;
    }

    function requestValidation(
        address server,
        bytes32 dataHash,
        string calldata validationType
    ) external returns (uint256 requestId) {
        if (server == address(0)) {
            revert InvalidServer();
        }

        requestId = nextRequestId;
        nextRequestId += 1;

        requests[requestId] = ValidationRequest({
            requester: msg.sender,
            server: server,
            dataHash: dataHash,
            validationType: validationType,
            exists: true
        });

        emit ValidationRequested(requestId, msg.sender, server, dataHash, validationType);
    }

    function submitValidationResponse(
        uint256 requestId,
        address validator,
        string calldata proofURI,
        bool verified
    ) external {
        if (msg.sender != authorizedValidator || validator != authorizedValidator) {
            revert InvalidValidator();
        }

        ValidationRequest storage request = requests[requestId];
        if (!request.exists) {
            revert UnknownRequest();
        }

        ValidationResult storage result = results[requestId];
        if (result.responded) {
            revert AlreadyResponded();
        }

        results[requestId] = ValidationResult({
            responded: true,
            verified: verified,
            validator: validator,
            proofURI: proofURI,
            timestamp: uint64(block.timestamp)
        });

        emit ValidationResponded(requestId, validator, verified, proofURI);
    }

    function getValidation(
        uint256 requestId
    ) external view returns (bool verified, string memory proofURI, bool responded, address validator, uint64 timestamp) {
        ValidationResult storage result = results[requestId];
        return (result.verified, result.proofURI, result.responded, result.validator, result.timestamp);
    }

    function getValidationRequest(
        uint256 requestId
    ) external view returns (address requester, address server, bytes32 dataHash, string memory validationType, bool exists) {
        ValidationRequest storage request = requests[requestId];
        return (request.requester, request.server, request.dataHash, request.validationType, request.exists);
    }

    function isVerified(uint256 requestId) external view returns (bool) {
        ValidationResult storage result = results[requestId];
        return result.responded && result.verified;
    }
}
