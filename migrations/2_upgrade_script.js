const { upgradeProxy } = require("@openzeppelin/truffle-upgrades");

const Sale = artifacts.require("Sale");
const SaleV2 = artifacts.require("Sale");

module.exports = async function (deployer) {
  const existing = await Sale.deployed();
  const instance = await upgradeProxy(existing.address, SaleV2, {
    deployer,
  });
  console.log("Upgraded", instance.address);
};
