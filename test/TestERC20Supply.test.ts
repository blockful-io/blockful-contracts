import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";

describe("ERC20-Supply", function () {
	let ERC20: Contract;
	let owner: any;
	let userA: any;
	let userB: any;

	before(async () => {
		[owner, userA, userB] = await ethers.getSigners();
		const Factory = await ethers.getContractFactory("MyToken", owner);
		const Contract = await Factory.deploy("MyToken", "MYT");
		ERC20 = await Contract.deployed();

		expect(await ERC20.name()).to.equal("MyToken");
		expect(await ERC20.symbol()).to.equal("MYT");
		expect(await ERC20.decimals()).to.equal(18);
	});

	it("should mint Max Uint256 then burn", async () => {
		const mintAmount = ethers.constants.MaxUint256;
		await ERC20.connect(owner).mint(owner.address, mintAmount);

		expect(await ERC20.balanceOf(owner.address)).to.be.equal(mintAmount);
		expect(await ERC20.totalSupply()).to.be.equal(mintAmount);

		await ERC20.connect(owner).burn(owner.address, mintAmount);

		expect(await ERC20.balanceOf(owner.address)).to.be.equal(0);
		expect(await ERC20.totalSupply()).to.be.equal(0);
	});

	it("should mint 1000 tokens to owner", async () => {
		const mintAmount = 1000;
		const totalSupply = await ERC20.connect(owner).totalSupply();

		await ERC20.connect(owner).mint(owner.address, mintAmount);

		expect(await ERC20.connect(owner).totalSupply()).to.equal(
			Number(totalSupply) + mintAmount
		);
		expect(await ERC20.balanceOf(owner.address)).to.equal(mintAmount);
	});

	it("should mint 1000 tokens to zero address", async () => {
		const mintAmount = 1000;
		const totalSupply = await ERC20.connect(owner).totalSupply();

		await ERC20.connect(owner).mint(ethers.constants.AddressZero, mintAmount);

		expect(await ERC20.connect(owner).totalSupply()).to.equal(
			Number(totalSupply) + mintAmount
		);
		expect(await ERC20.balanceOf(ethers.constants.AddressZero)).to.equal(
			mintAmount
		);
	});

	it("should mint 0 tokens to zero address and not affect anything", async () => {
		const mintAmount = 0;
		const totalSupply = await ERC20.connect(owner).totalSupply();

		await ERC20.connect(owner).mint(ethers.constants.AddressZero, mintAmount);

		expect(await ERC20.connect(owner).totalSupply()).to.equal(
			Number(totalSupply) + mintAmount
		);
	});

	it("should reject to mint more than Max Uint256", async () => {
		const mintAmount = ethers.constants.MaxUint256.add(1);

		await expect(ERC20.connect(owner).mint(userA.address, mintAmount)).to.be
			.rejected;
	});

	it("should reject to mint batches of Max Uint256", async () => {
		const mintAmount = ethers.constants.MaxUint256;
		await expect(ERC20.connect(owner).mint(userA.address, mintAmount)).to.be
			.rejected;
	});

	it("should be able to burn owned tokens", async () => {
		const balanceOf = await ERC20.balanceOf(owner.address);

		await ERC20.connect(owner).burn(owner.address, balanceOf);

		const balanceAfter = await ERC20.balanceOf(owner.address);
		expect(balanceAfter).to.equal(0);
		expect(balanceAfter).to.not.be.equal(balanceOf);
	});

	it("should be able to burn 0 tokens and not affect anything", async () => {
		const balanceOf = await ERC20.balanceOf(owner.address);
		const totalSupply = await ERC20.connect(owner).totalSupply();

		await ERC20.connect(owner).burn(owner.address, 0);

		const balanceAfter = await ERC20.balanceOf(owner.address);
		expect(balanceAfter).to.be.equal(balanceOf);

		expect(await ERC20.connect(owner).totalSupply()).to.equal(
			Number(totalSupply)
		);
	});

	it("should not be able to burn unexistant tokens", async () => {
		const mintAmount = 1000;
		await ERC20.connect(owner).mint(owner.address, mintAmount);

		const balanceOf = await ERC20.balanceOf(owner.address);
		expect(balanceOf).to.be.lessThan(mintAmount * 2);

		await expect(
			ERC20.connect(owner).burn(owner.address, mintAmount * 2)
		).to.be.revertedWithCustomError(ERC20, "ERC20InsufficientBalance");
	});
});
