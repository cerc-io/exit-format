import { AbiCoder, ParamType } from "ethers";
import { Allocation, Exit } from "./types";

const abiCoder = AbiCoder.defaultAbiCoder();

export const destinationABI = ParamType.from({
  name: "destination",
  type: "bytes32"
});

const allocationABI = ParamType.from({
  type: "tuple",
  components: [
    {
      name: "destination",
      type: "bytes32"
    },
    { name: "amount", type: "uint256" },
    { name: "allocationType", type: "uint8" },
    { name: "metadata", type: "bytes" },
  ],
});

export const exitABI = ParamType.from({
  type: "tuple[]",
  components: [
    { name: "asset", type: "address" },
    {
      name: "assetMetadata",
      type: "tuple",
      components: [
        { name: "assetType", type: "uint8" },
        { name: "metadata", type: "bytes" },
      ],
    },
    {
      type: "tuple[]",
      name: "allocations",
      components: allocationABI.components,
    },
  ],
});

export function encodeAllocation(allocation: Allocation) {
  return abiCoder.encode([allocationABI], [allocation]);
}

export function encodeExit(exit: Exit) {
  return abiCoder.encode([exitABI], [exit]);
}

export function decodeExit(_exit_: any) {
  return abiCoder.decode([exitABI], _exit_) as Exit;
}
