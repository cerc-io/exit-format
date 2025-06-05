import { ethers } from "hardhat";
import type { Signer, Result, BytesLike } from "ethers";
import { AbiCoder } from "ethers";
import { expect } from "chai";

import {
  Destination,
  SingleAssetExit,
  AllocationType,
  NullAssetMetadata,
  AssetType,
  AssetMetadata,
} from "../src/types";
import { destinationFromAddress } from "../src/utils";

import type { TestERC20 } from "../typechain-types/contracts/TestERC20";
import type { TestERC721 } from "../typechain-types/contracts/TestERC721";
import type { TestERC1155 } from "../typechain-types/contracts/TestERC1155";

// TODO can we get at the raw data returned from the eth_call?
export function rehydrateExit(exitResult: Result) {
  return exitResult.map((entry) => {
    const object = {};
    Object.keys(entry).forEach((key) => {
      if (key == "allocations") {
        object[key] = entry[key].map((allocation) => ({
          destination: allocation[0],
          amount: allocation[1],
          allocationType: allocation[2],
          metadata: allocation[3],
        }));
      } else if (Number(key) !== Number(key)) {
        object[key] = entry[key];
      }
    });
    return object;
  });
}

export function makeDestination(address: string): Destination {
  return destinationFromAddress(address);
}

interface MakeSimpleExitParameters {
  asset: string;
  destination: string;
  amount: number;
  assetMetadata: AssetMetadata;
}

export function makeSimpleExit({
  asset,
  destination,
  amount,
  assetMetadata,
}: MakeSimpleExitParameters): SingleAssetExit {
  return {
    asset,
    assetMetadata,
    allocations: [
      {
        destination: makeDestination(destination),
        amount,
        allocationType: AllocationType.simple,
        metadata: "0x",
      },
    ],
  };
}

export async function deployERC20(
  deployer: Signer,
  initialSupply: bigint | number
): Promise<TestERC20> {
  const factory = await ethers.getContractFactory("TestERC20", deployer);
  const erc20Token = await factory.deploy(initialSupply);
  await erc20Token.waitForDeployment();
  return erc20Token as TestERC20;
}

export async function deployERC721(deployer: Signer): Promise<TestERC721> {
  const factory = await ethers.getContractFactory("TestERC721", deployer);
  const erc721Collection = await factory.deploy();
  await erc721Collection.waitForDeployment();
  return erc721Collection as TestERC721;
}

export async function deployERC1155(
  deployer: Signer,
  initialSupply: bigint | number
): Promise<TestERC1155> {
  const factory = await ethers.getContractFactory("TestERC1155", deployer);
  const erc1155Collection = await factory.deploy(initialSupply);
  await erc1155Collection.waitForDeployment();
  return erc1155Collection as TestERC1155;
}

/**
 * Constructs a single asset exit pinned to the given chainID and assetHolder address.
 * The asset is the native asset of the chain.
 *
 * @param chainId The qualified asset's chain ID
 * @param assetHolder the qualified asset's asset holder contract address
 * @param address the recipient of the asset
 * @param amount the amount of the asset to transfer
 * @returns
 */
export function getQualifiedSAE(
  chainId: number,
  assetHolder: string,
  address: string,
  amount: string
): SingleAssetExit {
  const abiCoder = AbiCoder.defaultAbiCoder();
  return {
    asset: "0x0000000000000000000000000000000000000000",
    assetMetadata: {
      assetType: AssetType.Qualified,
      metadata: abiCoder.encode(
        ["uint chainID", "address assetHolder"],
        [chainId, assetHolder]
      ),
    },
    allocations: [
      {
        destination: makeDestination(address),
        amount,
        allocationType: AllocationType.simple,
        metadata: "0x",
      },
    ],
  };
}

// Replacement for ethereum-waffle's `expect().to.be.revertedWith()`
export async function expectRevert(promise: Promise<any>, expectedMessage: string) {
  try {
    await promise;
    throw new Error('Expected transaction to revert, but it succeeded');
  } catch (error: any) {
    if (error.message.includes(expectedMessage)) {
      return;
    }

    const reason = extractRevertReason(error);

    expect(reason).to.include(
      expectedMessage,
      `Expected revert with message "${expectedMessage}", but got "${reason}"`
    );
  }
}

// Extracts ethers v6 error messages
function extractRevertReason(error: any): string {
  if (error.shortMessage) return error.shortMessage; // Ethers v6 error
  if (error.reason) return error.reason;             // Legacy format
  return error.message || '';
}
