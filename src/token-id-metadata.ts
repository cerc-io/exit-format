import { AbiCoder, BytesLike } from "ethers";

const abiCoder = AbiCoder.defaultAbiCoder();

export function makeTokenIdExitMetadata(tokenId: number): BytesLike {
  return abiCoder.encode(["tuple(uint256)"], [[tokenId]]);
}
