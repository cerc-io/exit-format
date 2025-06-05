import { BytesLike } from "ethers";

// A Destination is a bytes32 value that either contains a zero-padded address or an application-specific identifier
// When containing an address, the address occupies the last 20 bytes with the first 12 bytes being zero
export type Destination = string; // bytes32

export enum AllocationType {
  simple,
  withdrawHelper,
  guarantee,
}

export interface Allocation {
  destination: Destination;
  amount: bigint; // a uint256;
  allocationType: number;
  metadata: BytesLike;
}

export interface SingleAssetExit {
  asset: string; // an Ethereum address
  assetMetadata: AssetMetadata;
  allocations: Allocation[];
}

export enum AssetType {
  Default,
  ERC721,
  ERC1155,
  Qualified,
}

export interface AssetMetadata {
  assetType: AssetType;
  metadata: BytesLike;
}

export interface QualifiedAssetMetaData {
  chainID: string; // a uint256
  assetHolder: string; // an Ethereum address
}

export const NullAssetMetadata: AssetMetadata = {
  assetType: AssetType.Default,
  metadata: "0x",
};

export type Exit = SingleAssetExit[];
