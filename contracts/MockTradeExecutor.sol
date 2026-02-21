// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockTradeExecutor
 * @notice Simple demo contract used by the AI Oracle Template.
 *         Allows an authorized oracle to trigger buy/sell actions.
 *         Emits TradeExecuted event for off-chain monitoring.
 */
contract MockTradeExecutor {

    event TradeExecuted(string action);

    error NotOracle();

    constructor() {
    }

    

    function buy() external  {
        emit TradeExecuted("BUY");
    }

    function sell() external  {
        emit TradeExecuted("SELL");
    }
}