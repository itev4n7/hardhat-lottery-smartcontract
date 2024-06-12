import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "hardhat";

const VRFCoordinatorV2Mock = buildModule("VRFCoordinatorV2Mock", (m) => {
  const deployer = m.getAccount(0);
  const baseFee = ethers.parseEther("0.25"); // 0.25 is premium, ts costs 0.25 LINK per request
  const gasPriceLink = 1e9;
  const vrfCoordinatorV2Mock = m.contract("VRFCoordinatorV2Mock", [baseFee, gasPriceLink], {
    from: deployer,
  });
  const createSubscriptionCall = m.call(vrfCoordinatorV2Mock, "createSubscription", []);
  const subId = m.readEventArgument(createSubscriptionCall, "SubscriptionCreated", "subId", {
    emitter: vrfCoordinatorV2Mock,
  });
  const vrfSubscriptionFundAmount = ethers.parseEther("30");
  m.call(vrfCoordinatorV2Mock, "fundSubscription", [subId, vrfSubscriptionFundAmount]);
  return { vrfCoordinatorV2Mock };
});

export default VRFCoordinatorV2Mock;
