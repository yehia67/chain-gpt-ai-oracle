// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IValidationRegistry {
    function isVerified(uint256 requestId) external view returns (bool);
}

contract MockTradeExecutorV2 {
    event TradeExecuted(string action, uint256 indexed validationRequestId, address indexed executor);

    error NotOracle();
    error ValidationNotVerified();
    error ValidationAlreadyConsumed();
    error InvalidAddress();

    address public immutable oracle;
    IValidationRegistry public immutable validationRegistry;

    mapping(uint256 => bool) public consumedValidationRequests;

    constructor(address oracleAddress, address validationRegistryAddress) {
        if (oracleAddress == address(0) || validationRegistryAddress == address(0)) {
            revert InvalidAddress();
        }

        oracle = oracleAddress;
        validationRegistry = IValidationRegistry(validationRegistryAddress);
    }

    modifier onlyOracle() {
        if (msg.sender != oracle) {
            revert NotOracle();
        }

        _;
    }

    function buy(uint256 validationRequestId) external onlyOracle {
        _consumeValidation(validationRequestId);
        emit TradeExecuted("BUY", validationRequestId, msg.sender);
    }

    function sell(uint256 validationRequestId) external onlyOracle {
        _consumeValidation(validationRequestId);
        emit TradeExecuted("SELL", validationRequestId, msg.sender);
    }

    function _consumeValidation(uint256 validationRequestId) private {
        if (consumedValidationRequests[validationRequestId]) {
            revert ValidationAlreadyConsumed();
        }

        if (!validationRegistry.isVerified(validationRequestId)) {
            revert ValidationNotVerified();
        }

        consumedValidationRequests[validationRequestId] = true;
    }
}
