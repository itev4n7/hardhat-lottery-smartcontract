import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { network, ethers } from "hardhat";
import "@nomicfoundation/hardhat-ignition-ethers";
import { networkConfig } from "../../helper-hardhat-config";
import VRFCoordinatorV2Mock from "./VRFCoordinatorV2Mock";

const MOCK_GAS_LANE = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";

const Raffle = buildModule("Raffle", (m) => {
  const deployer = m.getAccount(0);
  const chainId = network.config.chainId!;
  let vrfContract;
  if (chainId === 31337) {
    //deploys VRFCoordinatorV2Mock before deplying Raffle
    const { vrfCoordinatorV2Mock } = m.useModule(VRFCoordinatorV2Mock);
    vrfContract = m.contractAt("VRFCoordinatorV2Mock", vrfCoordinatorV2Mock);
  }
  const vrfCoordinatorAddress =
    chainId === 31337 ? vrfContract!.address : networkConfig[chainId].vrfCoordinator;
  const entranceFee =
    chainId === 31337 ? ethers.parseEther("0.1") : networkConfig[chainId].entranceFee;
  const gasLane = chainId === 31337 ? MOCK_GAS_LANE : networkConfig[chainId].gasLane;
  const subscriptionId = chainId === 31337 ? 1 : networkConfig[chainId].subscriptionId;
  const callbackGasLimit = chainId === 31337 ? "500000" : networkConfig[chainId].callbackGasLimit;
  const interval = chainId === 31337 ? "30" : networkConfig[chainId].interval;
  const args: any = [
    vrfCoordinatorAddress,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];
  const raffle = m.contract("Raffle", args, {
    from: deployer,
  });
  return { raffle };
});

export default Raffle;
