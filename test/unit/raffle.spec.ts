import { ethers, ignition, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import Raffle from "../../ignition/modules/Raffle";

describe("Raffle tests @unit", function () {
  async function deployRaffleFixture() {
    const [owner, ...otherAccounts] = await ethers.getSigners();
    const { raffle } = await ignition.deploy(Raffle);
    const vrfCoordinatorV2Mock = await ethers.getContractAt(
      "VRFCoordinatorV2Mock",
      await raffle.getFunction("getVFRCoordinatorAddress")(),
    );
    const subId = await raffle.getFunction("getSubscriptionId")();
    await vrfCoordinatorV2Mock.getFunction("addConsumer")(subId, await raffle.getAddress());
    const entranceFee = await raffle.getFunction("getEntranceFee")();
    const interval = await raffle.getFunction("getInterval")();
    return { raffle, entranceFee, interval, vrfCoordinatorV2Mock, owner, otherAccounts };
  }

  describe("constructor", function () {
    it("initializes the raffle correctly", async function () {
      const { raffle } = await loadFixture(deployRaffleFixture);
      const raffleState = await raffle.getFunction("getRaffleState")();
      const interval = await raffle.getFunction("getInterval")();
      expect(raffleState.toString()).to.equal("0");
      expect(interval.toString()).to.equal("30");
    });
  });

  describe("enterRaffle", function () {
    it("reverts if you don't pay enough", async function () {
      const { raffle, owner } = await loadFixture(deployRaffleFixture);
      const error = "Raffle__NotEnoughETHEntered";
      const txParams = {
        from: owner,
        value: ethers.parseEther("0"),
      };
      await expect(raffle.getFunction("enterRaffle")(txParams)).to.be.rejectedWith(error);
    });

    it("records players when they enter", async function () {
      const { raffle, entranceFee, owner } = await loadFixture(deployRaffleFixture);
      const txParams = {
        from: owner,
        value: entranceFee,
      };
      await raffle.getFunction("enterRaffle")(txParams);
      const playerFromContract = await raffle.getFunction("getPlayer")(0);
      expect(playerFromContract).to.be.equal(await owner.getAddress());
    });

    it("emits event on enter", async function () {
      const { raffle, entranceFee, owner } = await loadFixture(deployRaffleFixture);
      const txParams = {
        from: owner,
        value: entranceFee,
      };
      await expect(raffle.getFunction("enterRaffle")(txParams)).to.emit(raffle, "RaffleEnter");
    });

    it("doesn't allow to enter raffle when it in calculating stage", async function () {
      const { raffle, entranceFee, owner, interval } = await loadFixture(deployRaffleFixture);
      const error = "Raffle__NotOpen";
      const txParams = {
        from: owner,
        value: entranceFee,
      };
      await raffle.getFunction("enterRaffle")(txParams);
      await network.provider.send("evm_increaseTime", [parseInt(interval) + 1]);
      await network.provider.send("evm_mine", []);
      await raffle.getFunction("performUpkeep")("0x");
      await expect(raffle.getFunction("enterRaffle")(txParams)).to.be.rejectedWith(error);
    });
  });
  describe("checkUpkeep", function () {
    it("returns false if user haven't sent any ETH", async function () {
      const { raffle, interval } = await loadFixture(deployRaffleFixture);
      await network.provider.send("evm_increaseTime", [parseInt(interval) + 1]);
      await network.provider.send("evm_mine", []);
      const { upkeepNeeded } = await raffle.getFunction("checkUpkeep")("0x");
      expect(upkeepNeeded).to.be.false;
    });

    it("returns false if raffle is not open", async function () {
      const { raffle, entranceFee, owner, interval } = await loadFixture(deployRaffleFixture);
      const txParams = {
        from: owner,
        value: entranceFee,
      };
      await raffle.getFunction("enterRaffle")(txParams);
      await network.provider.send("evm_increaseTime", [parseInt(interval) + 1]);
      await network.provider.send("evm_mine", []);
      await raffle.getFunction("performUpkeep")("0x");
      const raffleState = await raffle.getFunction("getRaffleState")();
      const raffleCalculatingState = "1";
      const { upkeepNeeded } = await raffle.getFunction("checkUpkeep")("0x");
      expect(raffleState.toString()).to.be.equal(raffleCalculatingState);
      expect(upkeepNeeded).to.be.false;
    });

    it("returns false if enough time hasn't passed", async function () {
      const { raffle, entranceFee, owner, interval } = await loadFixture(deployRaffleFixture);
      const txParams = {
        from: owner,
        value: entranceFee,
      };
      await raffle.getFunction("enterRaffle")(txParams);
      await network.provider.send("evm_increaseTime", [parseInt(interval) - 2]);
      await network.provider.send("evm_mine", []);
      const { upkeepNeeded } = await raffle.getFunction("checkUpkeep")("0x");
      expect(upkeepNeeded).to.be.false;
    });

    it("returns true if all conditions are met", async function () {
      const { raffle, entranceFee, owner, interval } = await loadFixture(deployRaffleFixture);
      const txParams = {
        from: owner,
        value: entranceFee,
      };
      await raffle.getFunction("enterRaffle")(txParams);
      await network.provider.send("evm_increaseTime", [parseInt(interval) + 1]);
      await network.provider.send("evm_mine", []);
      const { upkeepNeeded } = await raffle.getFunction("checkUpkeep")("0x");
      expect(upkeepNeeded).to.be.true;
    });
  });

  describe("performUpkeep", function () {
    it("only run if checkUpkeep is true", async function () {
      const { raffle, owner, entranceFee, interval } = await loadFixture(deployRaffleFixture);
      const txParams = {
        from: owner,
        value: entranceFee,
      };
      await raffle.getFunction("enterRaffle")(txParams);
      await network.provider.send("evm_increaseTime", [parseInt(interval) + 1]);
      await network.provider.send("evm_mine", []);
      await expect(raffle.getFunction("performUpkeep")("0x")).not.to.be.reverted;
    });

    it("reverts if checkUpkeep is false", async function () {
      const { raffle, owner, entranceFee, interval } = await loadFixture(deployRaffleFixture);
      const error = "Raffle__UpkeepNotNeeded";
      const txParams = {
        from: owner,
        value: entranceFee,
      };
      await raffle.getFunction("enterRaffle")(txParams);
      await network.provider.send("evm_increaseTime", [parseInt(interval) - 3]);
      await network.provider.send("evm_mine", []);
      await expect(raffle.getFunction("performUpkeep")("0x")).to.be.rejectedWith(error);
    });

    it("updates raffle state and calls vrf coordinator", async function () {
      const { raffle, owner, entranceFee, interval } = await loadFixture(deployRaffleFixture);
      const txParams = {
        from: owner,
        value: entranceFee,
      };
      await raffle.getFunction("enterRaffle")(txParams);
      await network.provider.send("evm_increaseTime", [parseInt(interval) + 1]);
      await network.provider.send("evm_mine", []);
      const txResponse = await raffle.getFunction("performUpkeep")("0x");
      const txReceipt = await txResponse.wait();
      const requestId = Number(txReceipt.logs[1].args[0]);
      const raffleState = await raffle.getFunction("getRaffleState")();
      const raffleCalculatingState = "1";
      expect(requestId > 0).to.be.true;
      expect(raffleState).to.be.equal(raffleCalculatingState);
    });
  });

  describe("fulfillRandomWords", function () {
    beforeEach(async function () {
      const { raffle, owner, entranceFee, interval } = await loadFixture(deployRaffleFixture);
      const txParams = {
        from: owner,
        value: entranceFee,
      };
      await raffle.getFunction("enterRaffle")(txParams);
      await network.provider.send("evm_increaseTime", [parseInt(interval) + 1]);
      await network.provider.send("evm_mine", []);
    });

    it("can only be called after performUpkeep", async function () {
      const { raffle, vrfCoordinatorV2Mock } = await loadFixture(deployRaffleFixture);
      const error = "nonexistent request";
      await expect(
        vrfCoordinatorV2Mock.getFunction("fulfillRandomWords")(0, await raffle.getAddress()),
      ).to.be.rejectedWith(error);
      await expect(
        vrfCoordinatorV2Mock.getFunction("fulfillRandomWords")(1, await raffle.getAddress()),
      ).to.be.rejectedWith(error);
    });

    it("pickes winner then resets lottery and sends ETH", async function () {
      const { raffle, vrfCoordinatorV2Mock, entranceFee, interval, otherAccounts } =
        await loadFixture(deployRaffleFixture);
      const additionalEntrants = 3;
      for (let i = 0; i < additionalEntrants; i++) {
        const acoountConnectedRaffle = raffle.connect(otherAccounts[i]);
        const txParams = {
          from: otherAccounts[i],
          value: entranceFee,
        };
        await acoountConnectedRaffle.getFunction("enterRaffle")(txParams);
      }
      const startingTimeStamp = await raffle.getFunction("gatLatestTimeStamp")();

      await new Promise(async (resolve, reject) => {
        raffle.once("WinnerPicked", async () => {
          console.log("Found the event!");
          try {
            const raffleState = await raffle.getFunction("getRaffleState")();
            const raffleOpenState = "0";
            const endingTimeStamp = await raffle.getFunction("gatLatestTimeStamp")();
            const numPlayers = await raffle.getFunction("getNumberOfPlayres")();
            await network.provider.send("evm_mine", []);
            const winnerEndingBalance = await ethers.provider.getBalance(otherAccounts[2]);
            expect(numPlayers.toString()).to.be.equal("0");
            expect(raffleState.toString()).to.be.equal(raffleOpenState);
            expect(endingTimeStamp > startingTimeStamp).to.be.true;
            const calculatedWinnerBalance =
              winnerStartingBalance + entranceFee * BigInt(additionalEntrants);
            expect(winnerEndingBalance.toString()).to.be.equal(calculatedWinnerBalance.toString());
          } catch (error) {
            reject(error);
          }
          resolve(true);
        });
        await network.provider.send("evm_increaseTime", [parseInt(interval) + 1]);
        await network.provider.send("evm_mine", []);
        const txResponse = await raffle.getFunction("performUpkeep")("0x");
        const txReceipt = await txResponse.wait();
        const winnerStartingBalance = await ethers.provider.getBalance(otherAccounts[2]);
        try {
          const requestId = Number(txReceipt.logs[1].args[0]);
          await vrfCoordinatorV2Mock.getFunction("fulfillRandomWords")(
            requestId,
            await raffle.getAddress(),
          );
        } catch (error) {
          console.log(error);
        }
      });
    });
  });
});
