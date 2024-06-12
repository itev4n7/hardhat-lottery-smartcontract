import { ethers } from "hardhat";
import { expect } from "chai";

const raffleContractAddress = "0x683833a487Ec0Cc2Aa3ef917B70b404F5eb070F7";

//not working correctrly with VRF coordinator on test net probably due to version v2.5, our conctact designed for v2
describe("Raffle tests @staging", function () {
  async function deployRaffleFixture() {
    const [owner, ...otherAccounts] = await ethers.getSigners();
    //deploy on test net Raffle SC before runrring test, and add consumer inro VRF subscription
    const raffle = await ethers.getContractAt("Raffle", raffleContractAddress);
    const vrfCoordinatorV2Mock = await ethers.getContractAt(
      "VRFCoordinatorV2Mock",
      await raffle.getFunction("getVFRCoordinatorAddress")(),
    );
    const entranceFee = await raffle.getFunction("getEntranceFee")();
    const interval = await raffle.getFunction("getInterval")();
    return { raffle, entranceFee, interval, vrfCoordinatorV2Mock, owner, otherAccounts };
  }

  describe("fulfillRandomWords", function () {
    it("pickes random winner, using Chainlink testnet contracts", async function () {
      const { raffle, owner, entranceFee } = await deployRaffleFixture();
      const startingTimeStamp = await raffle.getFunction("gatLatestTimeStamp")();
      await new Promise(async (resolve, reject) => {
        raffle.once("WinnerPicked", async () => {
          console.log("WinnerPicked event fired!");
          try {
            const recentWinner = await raffle.getFunction("getRecentWinner")();
            const raffleState = await raffle.getFunction("getRaffleState")();
            const winnerEndingBalance = await ethers.provider.getBalance(owner);
            const endingTimeStamp = await raffle.getFunction("gatLatestTimeStamp")();
            await expect(raffle.getFunction("getRaffleState")(0)).to.be.rejected;
            expect(recentWinner).to.be.equal(owner.address);
            expect(raffleState.toString()).to.be.equal("0");
            expect(winnerEndingBalance).to.be.equal(winnerStartingBalance + entranceFee);
            expect(endingTimeStamp > startingTimeStamp).to.be.true;
          } catch (error) {
            reject(error);
          }
          resolve(true);
        });

        const txParams = {
          from: owner,
          value: entranceFee,
        };
        const tx = await raffle.getFunction("enterRaffle")(txParams);
        await tx.wait();
        const winnerStartingBalance = await ethers.provider.getBalance(owner);

        ///const txResponse = await raffle.performUpkeep("0x");
        //here some problem, tx is not resolved (manually it's pending too long, tx never be in mined block)

        //const txReceipt = await txResponse.wait();
        //console.log("performUpkeep executed, txReceipt:", txReceipt);
      });
    });
  });
});
