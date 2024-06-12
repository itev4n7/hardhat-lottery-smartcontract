# Lottry SC Project

for localhost:
```shell
yarn hardhat node
```
```shell
yarn hardhat ignition deploy ./ignition/modules/VRFCoordinatorV2Mock.ts --network localhost
```
```shell
yarn hardhat ignition deploy ./ignition/modules/Raffle.ts --network localhost
```

for sepolia:
```shell
yarn hardhat ignition deploy ./ignition/modules/Raffle.ts --network sepolia
```
verify:
```shell
yarn hardhat ignition verify chain-11155111
```

