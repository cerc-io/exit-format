import "@nomicfoundation/hardhat-ethers";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.28",
  typechain: {
    target: 'ethers-v6',
  },
};
