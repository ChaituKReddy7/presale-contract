const { assert } = require("chai");
const truffleAssertions = require("truffle-assertions");
const { deployProxy, upgradeProxy } = require("@openzeppelin/truffle-upgrades");
const helper = require("../utils/utils");

const saleContract = artifacts.require("./Sale.sol");
const tokenContract = artifacts.require("./mock/Token.sol");
const aggregatorContract = artifacts.require("./mock/Aggregator.sol");

require("chai").use(require("chai-as-promised")).should();

contract("PRESALE", (accounts) => {
  let token, saleToken, sale, aggregator;
  const MONTH = 30 * 24 * 3600;

  before(async () => {
    token = await tokenContract.new("SaleToken", "STKN", "1000000000000");
    saleToken = await tokenContract.new("SaleToken", "STKN", "1000000000000");
    aggregator = await aggregatorContract.new();
    await truffleAssertions.reverts(
      deployProxy(saleContract, [
        "0x0000000000000000000000000000000000000000",
        token.address,
      ]),
      "Zero aggregator address"
    );
    await truffleAssertions.reverts(
      deployProxy(saleContract, [
        token.address,
        "0x0000000000000000000000000000000000000000",
      ]),
      "Zero USDT address"
    );
    sale = await deployProxy(saleContract, [aggregator.address, token.address]);
  });

  describe("PRESALE: DEPLOYMENT", async () => {
    it("deploys Presale successfully", async () => {
      const address = await sale.address;
      assert.notEqual(address, 0x0);
      assert.notEqual(address, "");
      assert.notEqual(address, null);
      assert.notEqual(address, undefined);
    });
  });

  describe("PRESALE: METADATA", async () => {
    it("has correct base multiplier", async () => {
      const base = await sale.BASE_MULTIPLIER();
      base.toString().should.equal("1000000000000000000");
    });

    it("has correct month data", async () => {
      const base = await sale.MONTH();
      base.toString().should.equal("2592000");
    });

    it("has 0 presale id", async () => {
      const id = await sale.presaleId();
      id.toString().should.equal("0");
    });

    it("has correct aggregator", async () => {
      const price = await sale.getLatestPrice();
      price.toString().should.equal("1880000000000000000000");
    });

    it("has correct USDT address", async () => {
      const USDTInterface = await sale.USDTInterface();
      USDTInterface.should.equal(token.address);
    });
  });

  describe("PRESALE: CREATE_PRESALE", async () => {
    let date = Math.round(new Date().getTime() / 1000);
    it("should not create presale with invalid start time", async () => {
      await truffleAssertions.reverts(
        sale.createPresale(
          date - 20,
          date + 300,
          "60000000000000000",
          "1000000",
          "1000000000000000000",
          date + 10,
          MONTH,
          2 * MONTH
        ),
        "Invalid time"
      );
    });

    it("should not create presale with invalid end time", async () => {
      await truffleAssertions.reverts(
        sale.createPresale(
          date + 30,
          date + 10,
          "60000000000000000",
          "1000000",
          "1000000000000000000",
          date + 10,
          MONTH,
          2 * MONTH
        ),
        "Invalid time"
      );
    });

    it("should not create presale with zero price", async () => {
      await truffleAssertions.reverts(
        sale.createPresale(
          date + 30,
          date + 300,
          "0",
          "1000000",
          "1000000000000000000",
          date + 10,
          MONTH,
          2 * MONTH
        ),
        "Zero price"
      );
    });

    it("should not create presale with zero tokens", async () => {
      await truffleAssertions.reverts(
        sale.createPresale(
          date + 30,
          date + 300,
          "60000000000000000",
          "0",
          "1000000000000000000",
          date + 10,
          MONTH,
          2 * MONTH
        ),
        "Zero tokens to sell"
      );
    });

    it("should not create presale with zero decimals", async () => {
      await truffleAssertions.reverts(
        sale.createPresale(
          date + 30,
          date + 300,
          "60000000000000000",
          "1000000",
          "0",
          date + 10,
          MONTH,
          2 * MONTH
        ),
        "Zero decimals for the token"
      );
    });

    it("should not create presale with invalid vesting start time", async () => {
      await truffleAssertions.reverts(
        sale.createPresale(
          date + 30,
          date + 330,
          "60000000000000000",
          "1000000",
          "1000000000000000000",
          date + 10,
          MONTH,
          2 * MONTH
        ),
        "Vesting starts before Presale ends"
      );
    });

    it("should not allow others to create presale", async () => {
      await truffleAssertions.reverts(
        sale.createPresale(
          date + 30,
          date + 330,
          "60000000000000000",
          "1000000",
          "1000000000000000000",
          date + 360,
          MONTH,
          2 * MONTH,
          { from: accounts[1] }
        ),
        "Ownable: caller is not the owner"
      );
    });

    it("should allow owner to create presale", async () => {
      await sale.createPresale(
        date + 60,
        date + 360,
        "60000000000000000",
        "100000",
        "1000000000000000000",
        date + 420,
        MONTH,
        2 * MONTH
      );
      const newId = await sale.presaleId();
      newId.toString().should.equal("1", "Presale ID not updated correctly");
    });

    it("should have correct presale data", async () => {
      const presale = await sale.presale(1);
      presale[0]
        .toString()
        .should.equal(
          "0x0000000000000000000000000000000000000000",
          "Sale token not updated correctly"
        );

      presale[1]
        .toString()
        .should.equal(
          (date + 60).toString(),
          "Start time not updated correctly"
        );
      presale[2]
        .toString()
        .should.equal(
          (date + 360).toString(),
          "End time not updated correctly"
        );

      presale[7]
        .toString()
        .should.equal(
          (date + 420).toString(),
          "Vesting start time not updated correctly"
        );

      presale[8]
        .toString()
        .should.equal(MONTH.toString(), "Cliff not updated correctly");

      presale[9]
        .toString()
        .should.equal((2 * MONTH).toString(), "Period not updated correctly");
    });
  });

  describe("PRESALE: UPDATE_PRESALE", async () => {
    let date = Math.round(new Date().getTime() / 1000);

    it("should not allow to update time for wrong presale ID", async () => {
      await truffleAssertions.reverts(
        sale.changeSaleTimes(2, date + 20, date + 320),
        "Invalid presale id"
      );
    });

    it("should not allow both parameters to be 0", async () => {
      await truffleAssertions.reverts(
        sale.changeSaleTimes(1, 0, 0),
        "Invalid parameters"
      );
    });

    it("should not allow to update wrong start time", async () => {
      await truffleAssertions.reverts(
        sale.changeSaleTimes(1, date - 20, date + 320),
        "Sale time in past"
      );
    });

    it("should not allow to change start time once the sale starts", async () => {
      snapShot = await helper.takeSnapshot();
      snapshotId = snapShot["result"];
      await helper.advanceTimeAndBlock(60);
      await truffleAssertions.reverts(
        sale.changeSaleTimes(1, date + 200, date + 300),
        "Sale already started"
      );
      await helper.revertToSnapShot(snapshotId);
    });

    it("should not allow end time to be less than start time", async () => {
      await truffleAssertions.reverts(
        sale.changeSaleTimes(1, 0, date - 20),
        "Invalid endTime"
      );
    });

    it("should not allow to change end time once the sale ends", async () => {
      snapShot = await helper.takeSnapshot();
      snapshotId = snapShot["result"];
      await helper.advanceTimeAndBlock(600);
      await truffleAssertions.reverts(
        sale.changeSaleTimes(1, 0, date + 300),
        "Sale already ended"
      );
      await helper.revertToSnapShot(snapshotId);
    });

    it("should allow the owner to change the start and end time", async () => {
      const presale = await sale.presale(1);
      await sale.changeSaleTimes(1, (+presale[1] + 1).toString(), 0);
      await sale.changeSaleTimes(1, 0, (+presale[2] + 1).toString());
      const newPresale = await sale.presale(1);
      newPresale[1]
        .toString()
        .should.equal(
          (+presale[1] + 1).toString(),
          "Presale start time not updated"
        );
      newPresale[2]
        .toString()
        .should.equal(
          (+presale[2] + 1).toString(),
          "Presale end time not updated"
        );
      await sale.changeSaleTimes(
        1,
        presale[1].toString(),
        presale[2].toString()
      );
    });

    it("should not allow to change vesting start time for wrong presale id", async () => {
      await truffleAssertions.reverts(
        sale.changeVestingStartTime(2, date + 2000),
        "Invalid presale id"
      );
    });

    it("should not allow the vesting date to be set after sale starts", async () => {
      snapShot = await helper.takeSnapshot();
      snapshotId = snapShot["result"];
      await helper.advanceTimeAndBlock(60);
      await truffleAssertions.reverts(
        sale.changeVestingStartTime(1, date + 3000),
        "Sale already started"
      );
      await helper.revertToSnapShot(snapshotId);
    });

    it("should not allow the vesting start time to be before the sale ends", async () => {
      const presale = await sale.presale(1);
      await truffleAssertions.reverts(
        sale.changeVestingStartTime(1, presale[1].toString()),
        "Vesting starts before Presale ends"
      );
    });

    it("should not allow others to update the vesting start time", async () => {
      const presale = await sale.presale(1);
      await truffleAssertions.reverts(
        sale.changeVestingStartTime(1, (presale[2] + 30).toString(), {
          from: accounts[1],
        }),
        "Ownable: caller is not the owner"
      );
    });

    it("should allow the owner to update the vesting start time", async () => {
      const presale = await sale.presale(1);
      await sale.changeVestingStartTime(1, (+presale[2] + 120).toString());
      const updatedPresale = await sale.presale(1);
      updatedPresale[7]
        .toString()
        .should.equal(
          (+presale[2] + 120).toString(),
          "Vesting start time not updated correctly"
        );
    });

    it("should not allow to pause/unpause wrong presale", async () => {
      await truffleAssertions.reverts(
        sale.pausePresale(2),
        "Invalid presale id"
      );
    });

    it("should not allow the others to pause/unpause the presale", async () => {
      await truffleAssertions.reverts(
        sale.pausePresale(1, { from: accounts[1] }),
        "Ownable: caller is not the owner"
      );

      await truffleAssertions.reverts(
        sale.unPausePresale(1, { from: accounts[1] }),
        "Ownable: caller is not the owner"
      );
    });

    it("should allow owner to pause a presale", async () => {
      await sale.pausePresale(1);
      const status = await sale.paused(1);
      status.should.equal(true, "Pause status not updated correctly");
      await truffleAssertions.reverts(sale.pausePresale(1), "Already paused");
    });

    it("should allow owner to unpause a presale", async () => {
      await sale.unPausePresale(1);
      const status = await sale.paused(1);
      status.should.equal(false, "Pause status not updated correctly");
      await truffleAssertions.reverts(sale.unPausePresale(1), "Not paused");
    });

    it("should not allow to change price for wrong presale id", async () => {
      await truffleAssertions.reverts(
        sale.changePrice(2, 0),
        "Invalid presale id"
      );
    });

    it("should not allow to update 0 price", async () => {
      await truffleAssertions.reverts(sale.changePrice(1, 0), "Zero price");
    });

    it("should not allow the price to be changed after the sale starts", async () => {
      snapShot = await helper.takeSnapshot();
      snapshotId = snapShot["result"];
      await helper.advanceTimeAndBlock(60);
      await truffleAssertions.reverts(
        sale.changePrice(1, "10"),
        "Sale already started"
      );
      await helper.revertToSnapShot(snapshotId);
    });

    it("should not allow others to update the price", async () => {
      await truffleAssertions.reverts(
        sale.changePrice(1, "10", {
          from: accounts[1],
        }),
        "Ownable: caller is not the owner"
      );
    });

    it("should allow the owner to update the price", async () => {
      await sale.changePrice(1, "50000000000000000");
      const updatedPresale = await sale.presale(1);
      updatedPresale[3]
        .toString()
        .should.equal("50000000000000000", "Price not updated correctly");
    });
  });

  describe("PRESALE: BUY", async () => {
    it("should not allow users to buy wrong presale id", async () => {
      await truffleAssertions.reverts(
        sale.buyWithUSDT(2, 0),
        "Invalid presale id"
      );
      await truffleAssertions.reverts(
        sale.buyWithEth(2, 0),
        "Invalid presale id"
      );
    });

    it("should not allow users to buy before sale starts", async () => {
      await truffleAssertions.reverts(
        sale.buyWithUSDT(1, 10),
        "Invalid time for buying"
      );
      await truffleAssertions.reverts(
        sale.buyWithEth(1, 10),
        "Invalid time for buying"
      );
    });

    it("should not allow users to buy 0 amount", async () => {
      snapShot = await helper.takeSnapshot();
      snapshotId = snapShot["result"];
      await helper.advanceTimeAndBlock(60);
      await truffleAssertions.reverts(
        sale.buyWithUSDT(1, 0),
        "Invalid sale amount"
      );
      await truffleAssertions.reverts(
        sale.buyWithEth(1, 0),
        "Invalid sale amount"
      );
      await helper.revertToSnapShot(snapshotId);
    });

    it("should not allow users to buy more than max amount", async () => {
      snapShot = await helper.takeSnapshot();
      snapshotId = snapShot["result"];
      await helper.advanceTimeAndBlock(60);
      await truffleAssertions.reverts(
        sale.buyWithUSDT(1, "10000000000000"),
        "Invalid sale amount"
      );
      await truffleAssertions.reverts(
        sale.buyWithEth(1, "10000000000000"),
        "Invalid sale amount"
      );
      await helper.revertToSnapShot(snapshotId);
    });

    it("should not allow users to buy with no allowance", async () => {
      snapShot = await helper.takeSnapshot();
      snapshotId = snapShot["result"];
      await helper.advanceTimeAndBlock(60);
      await truffleAssertions.reverts(
        sale.buyWithUSDT(1, 10),
        "Make sure to add enough allowance"
      );
      await helper.revertToSnapShot(snapshotId);
    });

    it("should allow users to buy tokens with USDT after allowance", async () => {
      snapShot = await helper.takeSnapshot();
      snapshotId = snapShot["result"];
      await helper.advanceTimeAndBlock(60);
      await token.approve(sale.address, "1000000");
      const data = await sale.usdtBuyHelper(1, 10);
      data
        .toString()
        .should.equal("500000", "USDT buy helper not updating correctly");
      await sale.buyWithUSDT(1, 10);
      await sale.buyWithUSDT(1, 10);
      const newAllowance = await token.allowance(accounts[0], sale.address);
      newAllowance
        .toString()
        .should.equal("0", "Price deduction not updated correctly");
      await helper.revertToSnapShot(snapshotId);
    });

    it("should not allow users to buy with USDT and ETH when sale is paused", async () => {
      snapShot = await helper.takeSnapshot();
      snapshotId = snapShot["result"];
      await helper.advanceTimeAndBlock(60);
      await token.approve(sale.address, "500000");
      await sale.buyWithUSDT(1, 10);
      const newAllowance = await token.allowance(accounts[0], sale.address);
      newAllowance
        .toString()
        .should.equal("0", "Price deduction not updated correctly");

      await sale.pausePresale(1);
      await truffleAssertions.reverts(
        sale.buyWithUSDT(1, 10),
        "Presale paused"
      );

      await truffleAssertions.reverts(
        sale.buyWithEth(1, 10, { value: 265957446808511 }),
        "Presale paused"
      );
      await helper.revertToSnapShot(snapshotId);
    });

    it("should not allow users to buy with less eth payment", async () => {
      snapShot = await helper.takeSnapshot();
      snapshotId = snapShot["result"];
      await helper.advanceTimeAndBlock(60);
      await truffleAssertions.reverts(
        sale.buyWithEth(1, 10, { value: 1 }),
        "Less payment"
      );
      await helper.revertToSnapShot(snapshotId);
    });

    it("should allow users to buy with ETH", async () => {
      snapShot = await helper.takeSnapshot();
      snapshotId = snapShot["result"];
      await helper.advanceTimeAndBlock(60);
      const value = await sale.ethBuyHelper(1, 10);
      value
        .toString()
        .should.equal(
          "265957446808510",
          "EThh buy helper not updated correctly"
        );
      await sale.buyWithEth(1, 10, { value: 265957446808510 });
      await sale.buyWithEth(1, 10, { value: 1265957446808510 });
      await helper.revertToSnapShot(snapshotId);
    });

    it("should update the user vesting data correctly", async () => {
      snapShot = await helper.takeSnapshot();
      snapshotId = snapShot["result"];
      await helper.advanceTimeAndBlock(60);
      await sale.buyWithEth(1, 10, { value: 265957446808511 });
      const user = await sale.userVesting(accounts[0], 1);
      await helper.revertToSnapShot(snapshotId);
      user[0]
        .toString()
        .should.equal(
          "10000000000000000000",
          "Total amount not updated correctly"
        );
      user[1]
        .toString()
        .should.equal("0", "Total claimed amount not updated correctly");

      const presale = await sale.presale(1);
      (+presale[7] + MONTH)
        .toString()
        .should.equal(user[2].toString(), "Claim start not updated correctly");
      (+presale[7] + 3 * MONTH)
        .toString()
        .should.equal(user[3].toString(), "Claim start not updated correctly");
    });
  });

  describe("PRESALE: CLAIMING", async () => {
    it("should not allow users to call with wrong presale id", async () => {
      await truffleAssertions.reverts(
        sale.claimableAmount(accounts[2], 2),
        "Invalid presale id"
      );
    });

    it("should revert when non participate calls", async () => {
      await truffleAssertions.reverts(
        sale.claimableAmount(accounts[1], 1),
        "Nothing to claim"
      );
    });

    const buy = async () => {
      snapShot = await helper.takeSnapshot();
      snapshotId = snapShot["result"];
      await helper.advanceTimeAndBlock(60);
      await sale.buyWithEth(1, 10, { value: 265957446808511 });
      await sale.buyWithEth(1, 10, {
        from: accounts[1],
        value: 265957446808511,
      });
    };

    it("should return 0 before claim starts", async () => {
      await buy();
      const presale = await sale.presale(1);
      let date = Math.round(new Date().getTime() / 1000);
      await helper.advanceTimeAndBlock(presale[7].toString() - date);
      const amount = await sale.claimableAmount(accounts[0], 1);
      amount.toString().should.equal("0", "Amount not returned correctly");
      await helper.revertToSnapShot(snapshotId);
    });

    it("should return 0 during cliff", async () => {
      await buy();
      const presale = await sale.presale(1);
      let date = Math.round(new Date().getTime() / 1000);
      await helper.advanceTimeAndBlock(
        presale[7].toString() - date + MONTH - 1
      );
      const amount = await sale.claimableAmount(accounts[0], 1);
      await truffleAssertions.reverts(
        sale.claim(accounts[0], 1),
        "Zero claim amount"
      );
      amount.toString().should.equal("0", "Amount not returned correctly");
      await helper.revertToSnapShot(snapshotId);
    });

    it("should return correct amount after the first month", async () => {
      await buy();
      const presale = await sale.presale(1);
      let date = Math.round(new Date().getTime() / 1000);
      await helper.advanceTimeAndBlock(
        presale[7].toString() - date + MONTH + MONTH + 1
      );
      const amount = await sale.claimableAmount(accounts[0], 1);
      amount
        .toString()
        .should.equal("5000000000000000000", "Amount not returned correctly");
      await helper.revertToSnapShot(snapshotId);
    });

    it("should not allow users to claim when presale token address is not set", async () => {
      await buy();
      const presale = await sale.presale(1);
      let date = Math.round(new Date().getTime() / 1000);
      await helper.advanceTimeAndBlock(
        presale[7].toString() - date + MONTH + MONTH + 1
      );
      await truffleAssertions.reverts(
        sale.claim(accounts[0], 1),
        "Presale token address not set"
      );
      await helper.revertToSnapShot(snapshotId);
    });

    it("should not allow to update sale token address for wrong presale ID", async () => {
      await truffleAssertions.reverts(
        sale.changeSaleTokenAddress(2, saleToken.address),
        "Invalid presale id"
      );
    });

    it("should not allow others to update the sale token address", async () => {
      await truffleAssertions.reverts(
        sale.changeSaleTokenAddress(1, saleToken.address, {
          from: accounts[1],
        }),
        "Ownable: caller is not the owner"
      );
    });

    it("should not allow owner to set 0 address as sale token address", async () => {
      await truffleAssertions.reverts(
        sale.changeSaleTokenAddress(
          1,
          "0x0000000000000000000000000000000000000000"
        ),
        "Zero token address"
      );
    });

    it("should allow owner to set sale token address", async () => {
      await sale.changeSaleTokenAddress(1, saleToken.address);
      const presale = await sale.presale(1);
      presale[0]
        .toString()
        .should.equal(
          saleToken.address.toString(),
          "Sale token not updated correctly"
        );
    });

    it("should not allow user to claim tokens when the contract balance is less", async () => {
      await buy();
      const presale = await sale.presale(1);
      let date = Math.round(new Date().getTime() / 1000);
      await helper.advanceTimeAndBlock(
        presale[7].toString() - date + MONTH + MONTH + 1
      );
      await truffleAssertions.reverts(
        sale.claim(accounts[0], 1),
        "Not enough tokens in the contract"
      );
      await helper.revertToSnapShot(snapshotId);
    });

    it("should allow user to claim tokens", async () => {
      await buy();
      const presale = await sale.presale(1);
      let date = Math.round(new Date().getTime() / 1000);
      await helper.advanceTimeAndBlock(
        presale[7].toString() - date + MONTH + MONTH + 1
      );
      await saleToken.transfer(sale.address, "5000000000000000000");
      await sale.claim(accounts[0], 1);
      const balance = await saleToken.balanceOf(sale.address);
      balance.toString().should.equal("0", "Claim not updated correctly");
      const user = await sale.userVesting(accounts[0], 1);
      user[1]
        .toString()
        .should.equal(
          "5000000000000000000",
          "Claimed amount not updated correctly"
        );
      await helper.revertToSnapShot(snapshotId);
    });

    it("should allow users to claim remaining amount at end of vesting period", async () => {
      await buy();
      const presale = await sale.presale(1);
      let date = Math.round(new Date().getTime() / 1000);
      await helper.advanceTimeAndBlock(
        presale[7].toString() - date + 3 * MONTH
      );
      await saleToken.transfer(sale.address, "10000000000000000000");
      await sale.claim(accounts[0], 1);
      const balance = await saleToken.balanceOf(sale.address);
      balance.toString().should.equal("0", "Claim not updated correctly");
      const user = await sale.userVesting(accounts[0], 1);
      user[1]
        .toString()
        .should.equal(
          "10000000000000000000",
          "Claimed amount not updated correctly"
        );
      await truffleAssertions.reverts(
        sale.claim(accounts[0], 1),
        "Already claimed"
      );
      await helper.revertToSnapShot(snapshotId);
    });

    it("should allow users to claim remaining amount at end of vesting period", async () => {
      await buy();
      const presale = await sale.presale(1);
      let date = Math.round(new Date().getTime() / 1000);
      await helper.advanceTimeAndBlock(
        presale[7].toString() - date + 3 * MONTH
      );
      await saleToken.transfer(sale.address, "20000000000000000000");
      await sale.claimMultiple([accounts[0], accounts[1]], 1);
      await truffleAssertions.reverts(
        sale.claimMultiple([], 1),
        "Zero users length"
      );
      const balance = await saleToken.balanceOf(sale.address);
      balance.toString().should.equal("0", "Claim not updated correctly");
      const user = await sale.userVesting(accounts[0], 1);
      user[1]
        .toString()
        .should.equal(
          "10000000000000000000",
          "Claimed amount not updated correctly"
        );
      await truffleAssertions.reverts(
        sale.claim(accounts[0], 1),
        "Already claimed"
      );

      const user2 = await sale.userVesting(accounts[1], 1);
      user2[1]
        .toString()
        .should.equal(
          "10000000000000000000",
          "Claimed amount not updated correctly"
        );
      await truffleAssertions.reverts(
        sale.claim(accounts[1], 1),
        "Already claimed"
      );
      await helper.revertToSnapShot(snapshotId);
    });
  });
});
