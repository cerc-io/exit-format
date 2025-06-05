import "hardhat";
import "@nomicfoundation/hardhat-ethers";
import { Wallet, parseEther, defaultAbiCoder } from "ethers";
import { expect } from "chai";

import {
  Destination,
  Allocation,
  AllocationType,
  Exit,
  NullAssetMetadata,
  SingleAssetExit,
  AssetType,
} from "../src/types";
import { makeTokenIdExitMetadata } from "../src/token-id-metadata";

import { TestConsumer } from "../typechain/TestConsumer";
import {
  makeSimpleExit,
  makeDestination,
  deployERC20,
  deployERC721,
  deployERC1155,
  getQualifiedSAE,
  expectRevert,
} from "./test-helpers";

describe("ExitFormat (solidity)", function () {
  let testConsumer: TestConsumer;

  before(async () => {
    const factory = await ethers.getContractFactory("TestConsumer");
    testConsumer = await factory.deploy();
    await testConsumer.waitForDeployment();
  });

  it("Can encode an allocation", async function () {
    const allocation: Allocation = {
      destination: makeDestination("0x96f7123E3A80C9813eF50213ADEd0e4511CB820f"),
      amount: 1n,
      allocationType: AllocationType.simple,
      metadata: "0x",
    };
    const encodedAllocation = await testConsumer.encodeAllocation(allocation);

    expect(encodedAllocation).to.eq(
      "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000096f7123e3a80c9813ef50213aded0e4511cb820f0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("Can encode an exit", async function () {
    const exit: Exit = [
      {
        asset: "0x0000000000000000000000000000000000000000",
        assetMetadata: NullAssetMetadata,
        allocations: [
          {
            destination: makeDestination("0x96f7123E3A80C9813eF50213ADEd0e4511CB820f"),
            amount: 1n,
            allocationType: AllocationType.simple,
            metadata: "0x",
          },
        ],
      },
    ];
    const encodedExit = await testConsumer.encodeExit(exit);

    expect(encodedExit).to.eq(
      "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000096f7123e3a80c9813ef50213aded0e4511cb820f0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000"
    );
  });

  it("Can compare destinations for equality", async function () {
    const destA = makeDestination("0x96f7123E3A80C9813eF50213ADEd0e4511CB820f");
    const destB = makeDestination("0x96f7123E3A80C9813eF50213ADEd0e4511CB820f");
    // destC is a different application-specific identifier (non-zero first 12 bytes)
    const destC = "0x4200000000000000000000000000000000000000000000000000000000000000";

    const destinationsABequal = await testConsumer.destinationsEqual(destA, destB);
    const destinationsACequal = await testConsumer.destinationsEqual(destA, destC);
    expect(destinationsABequal).to.be.true;
    expect(destinationsACequal).to.be.false;
  });

  it("Can compare exits for equality", async function () {
    const allocations: Allocation[] = [
      {
        destination: makeDestination("0x96f7123E3A80C9813eF50213ADEd0e4511CB820f"),
        amount: 1n,
        allocationType: AllocationType.simple,
        metadata: "0x",
      },
    ];

    const assetA = "0x0000000000000000000000000000000000000000";
    const assetC = "0x0000000000000000000000000000000000000001";

    const exitA: Exit = [
      {
        asset: assetA,
        assetMetadata: NullAssetMetadata,
        allocations,
      },
    ];

    const exitB: Exit = [
      {
        asset: assetA,
        assetMetadata: NullAssetMetadata,
        allocations,
      },
    ];

    const exitC: Exit = [
      {
        asset: assetC,
        assetMetadata: NullAssetMetadata,
        allocations,
      },
    ];
    const exitsABequal = await testConsumer.exitsEqual(exitA, exitB);
    const exitsACequal = await testConsumer.exitsEqual(exitA, exitC);
    expect(exitsABequal).to.be.true;
    expect(exitsACequal).to.be.false;
  });

  it("Can execute a single asset exit and a whole exit", async function () {
    const amount = 1n;
    // We will deposit twice the amount, because we want to test two different ways of executing the exit
    const totalDeposit = amount * 2n;
    const [depositor] = await ethers.getSigners();

    const alice = new Wallet(
      "0x68d3e3134e2b3488ad249233f8fa77ea040bbb6434ea28e4acde7db082665c4c"
    );

    const singleAssetExit: SingleAssetExit = {
      asset: "0x0000000000000000000000000000000000000000",
      assetMetadata: NullAssetMetadata,
      allocations: [
        {
          destination: makeDestination(alice.address),
          amount,
          allocationType: AllocationType.simple,
          metadata: "0x",
        },
      ],
    };

    // Send ETH to TestConsumer
    await depositor.sendTransaction({
      to: await testConsumer.getAddress(),
      value: totalDeposit,
    });

    // Execute a single-asset exit
    await (await testConsumer.executeSingleAssetExit(singleAssetExit)).wait();
    expect(await ethers.provider.getBalance(alice.address)).to.equal(amount);

    // Execute the same exit again
    await (await testConsumer.executeExit([singleAssetExit])).wait();
    expect(await ethers.provider.getBalance(alice.address)).to.equal(amount * 2n);
  });

  it("Can execute a single ERC20 asset exit", async function () {
    const [alice] = await ethers.getSigners();

    // Alice gets all of the initial minting of tokens
    const initialSupply = parseEther("1000");
    const erc20Token = await deployERC20(alice, initialSupply);

    // Alice transfers all tokens to TestConsumer
    await erc20Token.transfer(await testConsumer.getAddress(), initialSupply);
    expect(await erc20Token.balanceOf(alice.address)).to.equal(0n);
    expect(await erc20Token.balanceOf(await testConsumer.getAddress())).to.equal(
      initialSupply
    );

    const singleAssetExit: SingleAssetExit = makeSimpleExit({
      asset: erc20Token.getAddress(),
      destination: alice.address,
      amount: initialSupply,
      assetMetadata: {
        assetType: AssetType.Default,
        metadata: "0x",
      },
    });

    await (await testConsumer.executeSingleAssetExit(singleAssetExit)).wait();
    expect(await erc20Token.balanceOf(alice.address)).to.equal(initialSupply);
    expect(await erc20Token.balanceOf(await testConsumer.getAddress())).to.equal(0n);
  });

  it("Can execute a single ERC721 asset exit", async function () {
    const [alice] = await ethers.getSigners();
    const tokenId = 11n;

    // Alice gets all of the initial minting of tokens
    const erc721Collection = await deployERC721(alice);

    // Alice transfers all tokens to the TestConsumer
    await erc721Collection.transferFrom(
      alice.address,
      await testConsumer.getAddress(),
      tokenId
    );
    expect(await erc721Collection.ownerOf(tokenId)).to.equal(
      await testConsumer.getAddress()
    );

    const singleAssetExit: SingleAssetExit = makeSimpleExit({
      asset: erc721Collection.getAddress(),
      destination: alice.address,
      amount: 1n,
      assetMetadata: {
        assetType: AssetType.ERC721,
        metadata: makeTokenIdExitMetadata(tokenId),
      },
    });

    // Use the exit to withdraw the tokens
    await (await testConsumer.executeSingleAssetExit(singleAssetExit)).wait();
    expect(await erc721Collection.ownerOf(tokenId)).to.equal(alice.address);
  });

  it("ERC721 exits with amount != 1 fail", async function () {
    const [alice] = await ethers.getSigners();
    const erc721Collection = await deployERC721(alice);
    const tokenId = 11n;

    const singleAssetExit: SingleAssetExit = makeSimpleExit({
      asset: erc721Collection.getAddress(),
      destination: alice.address,
      amount: 10n, // needs to be 1 for ERC721 exits
      assetMetadata: {
        assetType: AssetType.ERC721,
        metadata: makeTokenIdExitMetadata(tokenId),
      },
    });

    await expectRevert(
      testConsumer.executeSingleAssetExit(singleAssetExit),
      "Amount must be 1 for an ERC721 exit"
    );
  });

  it("ERC721 exits with invalid tokenId", async function () {
    const [alice] = await ethers.getSigners();
    const erc721Collection = await deployERC721(alice);
    const invalidTokenId = 999n;

    const singleAssetExit: SingleAssetExit = makeSimpleExit({
      asset: erc721Collection.getAddress(),
      destination: alice.address,
      amount: 1n,
      assetMetadata: {
        assetType: AssetType.ERC721,
        metadata: makeTokenIdExitMetadata(invalidTokenId),
      },
    });

    await expectRevert(
      testConsumer.executeSingleAssetExit(singleAssetExit),
      "ERC721NonexistentToken"
    );
  });

  it("Can execute a single ERC1155 asset exit", async function () {
    const [alice] = await ethers.getSigners();
    const tokenId = 11n;

    const initialSupply = parseEther("1000");
    const erc1155Collection = await deployERC1155(alice, initialSupply);

    await erc1155Collection.safeTransferFrom(
      alice.address,
      await testConsumer.getAddress(),
      tokenId,
      initialSupply,
      "0x"
    );
    expect(
      await erc1155Collection.balanceOf(alice.address, tokenId)
    ).to.equal(0n);
    expect(
      await erc1155Collection.balanceOf(await testConsumer.getAddress(), tokenId)
    ).to.equal(initialSupply);

    const singleAssetExit: SingleAssetExit = makeSimpleExit({
      asset: erc1155Collection.getAddress(),
      destination: alice.address,
      amount: initialSupply,
      assetMetadata: {
        assetType: AssetType.ERC1155,
        metadata: makeTokenIdExitMetadata(tokenId),
      },
    });

    await (await testConsumer.executeSingleAssetExit(singleAssetExit)).wait();
    expect(
      await erc1155Collection.balanceOf(alice.address, tokenId)
    ).to.equal(initialSupply);
    expect(
      await erc1155Collection.balanceOf(await testConsumer.getAddress(), tokenId)
    ).to.equal(0n);
  });

  it("Can execute multiple ERC1155 asset exits from the same collection", async function () {
    const [alice] = await ethers.getSigners();
    const tokenAId = 11n;
    const tokenBId = 22n;

    const initialSupply = parseEther("1000");
    const erc1155Collection = await deployERC1155(alice, initialSupply);

    await erc1155Collection.safeTransferFrom(
      alice.address,
      await testConsumer.getAddress(),
      tokenAId,
      initialSupply,
      "0x"
    );
    await erc1155Collection.safeTransferFrom(
      alice.address,
      await testConsumer.getAddress(),
      tokenBId,
      initialSupply,
      "0x"
    );

    expect(
      await erc1155Collection.balanceOf(await testConsumer.getAddress(), tokenAId)
    ).to.equal(initialSupply);
    expect(
      await erc1155Collection.balanceOf(await testConsumer.getAddress(), tokenBId)
    ).to.equal(initialSupply);

    const exit: Exit = [
      makeSimpleExit({
        asset: erc1155Collection.getAddress(),
        destination: alice.address,
        amount: initialSupply,
        assetMetadata: {
          assetType: AssetType.ERC1155,
          metadata: makeTokenIdExitMetadata(tokenAId),
        },
      }),
      makeSimpleExit({
        asset: erc1155Collection.getAddress(),
        destination: alice.address,
        amount: initialSupply,
        assetMetadata: {
          assetType: AssetType.ERC1155,
          metadata: makeTokenIdExitMetadata(tokenBId),
        },
      }),
    ];

    await (await testConsumer.executeExit(exit)).wait();
    expect(
      await erc1155Collection.balanceOf(alice.address, tokenAId)
    ).to.equal(initialSupply);
    expect(
      await erc1155Collection.balanceOf(alice.address, tokenBId)
    ).to.equal(initialSupply);
  });

  it("Correctly interprets qualified assets", async function () {
    const amount = 1n;
    const zero = 0n;
    const [depositor] = await ethers.getSigners();

    // Deposit native asset into TestConsumer
    await depositor.sendTransaction({
      to: await testConsumer.getAddress(),
      value: amount,
    });

    const alice = new Wallet(
      "0x68d3e3134e2b3488ad249233f8fa77ea040bbb6434ea28e4acde7db08200000a"
    );

    // Note: correct chainID is 31337 (default hardhat chainID)
    //       correct asset holder address is testConsumer.address

    // failure: wrong chain ID
    const withBadChainID = getQualifiedSAE(
      1, // eth mainnet
      await testConsumer.getAddress(),
      alice.address,
      amount
    );
    await (await testConsumer.executeSingleAssetExit(withBadChainID)).wait();
    expect(await ethers.provider.getBalance(alice.address)).to.equal(zero);

    // failure: wrong asset holder
    const badAssetHolder = getQualifiedSAE(
      31337,
      alice.address,
      alice.address,
      amount
    );
    await (await testConsumer.executeSingleAssetExit(badAssetHolder)).wait();
    expect(await ethers.provider.getBalance(alice.address)).to.equal(zero);

    // success: correct qualification
    const correctQualified = getQualifiedSAE(
      31337,
      await testConsumer.getAddress(),
      alice.address,
      amount
    );
    await (await testConsumer.executeSingleAssetExit(correctQualified)).wait();
    expect(await ethers.provider.getBalance(alice.address)).to.equal(amount);
  });
});
