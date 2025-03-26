import { utils } from "ethers";
import { Destination } from "./types";

const { getAddress, hexZeroPad: zeroPadValue } = utils;

export const equalDestinations = (a: Destination, b: Destination): boolean => {
  return a.toLowerCase() === b.toLowerCase();
};

// Create a destination from an Ethereum address (zero-padded in first 12 bytes)
export const destinationFromAddress = (address: string): Destination => {
  const addr = getAddress(address); // normalize the address
  return zeroPadValue(addr, 32);
};

// Check if a destination represents an address (first 12 bytes are zero)
export const isAddressDestination = (destination: Destination): boolean => {
  return destination.slice(0, 26) === "0x000000000000000000000000"; // "0x" + 24 chars (12 bytes)
};

// Extract the address from a destination (only if it's an address destination)
export const getDestinationAddress = (destination: Destination): string => {
  if (!isAddressDestination(destination)) {
    throw new Error("Destination is not an address");
  }
  return getAddress("0x" + destination.slice(26)); // remove "0x" + first 24 chars
};
