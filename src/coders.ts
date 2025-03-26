import { defaultAbiCoder, ParamType } from "@ethersproject/abi";
import { Allocation, Exit } from "./types";

export const destinationABI = {
  name: "destination",
  type: "bytes32"
};

const allocationABI = {
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
} as ParamType;

export const exitABI = {
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
} as ParamType;

export function encodeAllocation(allocation: Allocation) {
  return defaultAbiCoder.encode([allocationABI], [allocation]);
}

export function encodeExit(exit: Exit) {
  return defaultAbiCoder.encode([exitABI], [exit]);
}

export function decodeExit(_exit_: any) {
  return defaultAbiCoder.decode([exitABI], _exit_) as Exit;
}
