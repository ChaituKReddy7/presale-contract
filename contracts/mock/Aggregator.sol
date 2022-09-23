// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

contract Aggregator {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (0, 188000000000, 0, 0, 0);
    }
}
