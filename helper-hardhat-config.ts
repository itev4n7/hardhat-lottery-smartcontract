import { ethers } from "hardhat";

export type NetworkConfig = {
  [networkId: number]: {
    name: string;
    vrfCoordinator: string;
    entranceFee: bigint;
    gasLane: string;
    subscriptionId: string;
    callbackGasLimit: string;
    interval: string;
  };
};

export const networkConfig: NetworkConfig = {
  11155111: {
    name: "Sepolia",
    // https://docs.chain.link/data-feeds/price-feeds/addresses#Sepolia%20Testnet
    vrfCoordinator: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    entranceFee: ethers.parseEther("0.01"),
    gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    subscriptionId: "25357660879958529896090656753584411119659049028695682647331669250789547881133",
    callbackGasLimit: "500000",
    interval: "30",
  },
};
