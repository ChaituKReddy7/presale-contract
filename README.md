# IMPT Presale contract

<p>Upgradeable presale contract to create multiple presales with different vesting periods for claiming. </p>

## External Dependencies

1. Chainlink Oracle for ETH price in USD - 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419

## Deployment and Upgrade steps.

1. Create a new `.secret` and `truffle-config.js` files with private key or mnemonic of a wallet and Infura API key for the selected network.

2. Update the deploy script `1_deploy_script.js` with correct Chainlink oracle and USDT token address of the network.

3. Run the script to deploy an upgradeable sale contract(deploys - ProxyAdmin, Proxy and Sale contract).

```
truffle migrate --reset --to 1
```

4. Deployment details can be found under the `.openzeppelin` folder for the deployed network.

5. To upgrade the sale contract, either create a new version or update the existing code and run the `2_upgrade_script.js` by making necessary changes.

```
truffle migrate --reset --f 2
```
