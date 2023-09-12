import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";

describe("TestERC20", function () {
	let ERC20: Contract;
	let tokenName: string;
	let owner: any;
	let userA: any;
	let userB: any;

	before(async () => {
		[owner, userA, userB] = await ethers.getSigners();
		const Factory = await ethers.getContractFactory("MyToken", owner);
		const Contract = await Factory.deploy("MyToken", "MYT");
		ERC20 = await Contract.deployed();

		tokenName = await ERC20.name();

		expect(tokenName).to.equal("MyToken");
		expect(await ERC20.symbol()).to.equal("MYT");
		expect(await ERC20.decimals()).to.equal(18);

		await ERC20.mint(userA.address, 1000);
	});

	it("should approve 1000 tokens to userA as userB", async () => {
		expect(await ERC20.connect(userB).approve(userA.address, 1000))
			.to.emit(ERC20, "Approval")
			.withArgs(userB.address, userA.address, 1000);
	});

	it("should approve to 0 tokens to userA as userB", async () => {
		expect(await ERC20.connect(userB).approve(userA.address, 0))
			.to.emit(ERC20, "Approval")
			.withArgs(userB.address, userA.address, 0);
	});

	it("should approve to Max Uint256 tokens to userA as userB", async () => {
		expect(
			await ERC20.connect(userB).approve(
				userA.address,
				ethers.constants.MaxUint256
			)
		)
			.to.emit(ERC20, "Approval")
			.withArgs(userB.address, userA.address, ethers.constants.MaxUint256);
	});

	it("Should consume allowance when transferring from userA to userB as userB", async () => {
		await ERC20.mint(userA.address, 1000);

		expect(await ERC20.connect(userA).approve(userB.address, 1000))
			.to.emit(ERC20, "Approval")
			.withArgs(userB.address, userA.address, 1000);

		await expect(
			ERC20.connect(userB).transferFrom(userA.address, userB.address, 1000)
		)
			.to.emit(ERC20, "Transfer")
			.withArgs(userA.address, userB.address, 1000);

		expect(await ERC20.allowance(userA.address, userB.address)).to.be.equal(0);
	});

	it("Should not consume allowance at maxUint256 when transferring from userA to userB as userB", async () => {
		await ERC20.mint(userA.address, 1000);

		expect(await ERC20.connect(userA).approve(userB.address, 1000))
			.to.emit(ERC20, "Approval")
			.withArgs(userB.address, userA.address, 1000);

		await expect(
			ERC20.connect(userB).transferFrom(userA.address, userB.address, 1000)
		)
			.to.emit(ERC20, "Transfer")
			.withArgs(userA.address, userB.address, 1000);

		expect(await ERC20.allowance(userA.address, userB.address)).to.be.equal(
			ethers.constants.AddressZero
		);
	});

	it("should fail to increase userA allowance when at Max Uint256 as userB", async () => {
		await ERC20.connect(userB).approve(
			userA.address,
			ethers.constants.MaxUint256
		);
		await expect(ERC20.connect(userB).increaseAllowance(userA.address, 1000)).to
			.be.rejected;
	});

	it("Should be able to increase allowance of 1000 tokens to userA as userB", async () => {
		await ERC20.connect(userB).approve(userA.address, 0);
		expect(await ERC20.connect(userB).increaseAllowance(userA.address, 1000))
			.to.emit(ERC20, "Approval")
			.withArgs(userB.address, userA.address, 1000);
	});

	it("Should be able to decrease allowance of 1000 tokens to userA as userB", async () => {
		await ERC20.connect(userB).approve(userA.address, 0);
		await ERC20.connect(userB).approve(userA.address, 1000);
		expect(await ERC20.connect(userB).decreaseAllowance(userA.address, 1000))
			.to.emit(ERC20, "Approval")
			.withArgs(userB.address, userA.address, 1000);
		expect(await ERC20.allowance(owner.address, userA.address)).to.equal(0);
	});

	it("Should not be able to decrease allowance of 1000 tokens to userA when allowance is 0", async () => {
		await ERC20.approve(userA.address, 0);
		await expect(
			ERC20.decreaseAllowance(userA.address, 1000)
		).to.be.revertedWithCustomError(ERC20, "ERC20FailedDecreaseAllowance");
	});

	it("Should be able to permit userA to move tokens of userB", async () => {
		const _owner = userB.address;
		const spender = userA.address;
		const value = 1000;
		const nonce = await ERC20.nonces(_owner);
		const deadline = ethers.constants.MaxUint256;

		const domain = {
			name: tokenName,
			version: "1",
			chainId: (await ethers.provider.getNetwork()).chainId,
			verifyingContract: ERC20.address,
		};

		const types = {
			Permit: [
				{ name: "owner", type: "address" },
				{ name: "spender", type: "address" },
				{ name: "value", type: "uint256" },
				{ name: "nonce", type: "uint256" },
				{ name: "deadline", type: "uint256" },
			],
		};

		const permit = {
			owner: _owner,
			spender: spender,
			value: value,
			nonce: nonce,
			deadline: deadline,
		};

		const signature = await userB._signTypedData(domain, types, permit);
		const sig = ethers.utils.splitSignature(signature);

		await ERC20.permit(_owner, spender, value, deadline, sig.v, sig.r, sig.s);

		expect(await ERC20.allowance(_owner, spender)).to.equal(value.toString());
	});

	it("Should not be able to use a permit a second time", async () => {
		const _owner = userB.address;
		const spender = userA.address;
		const value = 1000;
		const nonce = await ERC20.nonces(_owner);
		const deadline = ethers.constants.MaxUint256;

		const domain = {
			name: tokenName,
			version: "1",
			chainId: (await ethers.provider.getNetwork()).chainId,
			verifyingContract: ERC20.address,
		};

		const types = {
			Permit: [
				{ name: "owner", type: "address" },
				{ name: "spender", type: "address" },
				{ name: "value", type: "uint256" },
				{ name: "nonce", type: "uint256" },
				{ name: "deadline", type: "uint256" },
			],
		};

		const permit = {
			owner: _owner,
			spender: spender,
			value: value,
			nonce: nonce.sub(1),
			deadline: deadline,
		};

		const signature = await userB._signTypedData(domain, types, permit);
		const sig = ethers.utils.splitSignature(signature);

		await expect(
			ERC20.permit(_owner, spender, value, deadline, sig.v, sig.r, sig.s)
		).to.be.revertedWithCustomError(ERC20, "ERC2612InvalidSigner");
	});

	it("Should not be able to use an expired permit", async () => {
		const _owner = userB.address;
		const spender = userA.address;
		const value = 1000;
		const nonce = await ERC20.nonces(_owner);
		const deadline = (await ethers.provider.getBlock("latest")).timestamp - 1;

		const domain = {
			name: tokenName,
			version: "1",
			chainId: (await ethers.provider.getNetwork()).chainId,
			verifyingContract: ERC20.address,
		};

		const types = {
			Permit: [
				{ name: "owner", type: "address" },
				{ name: "spender", type: "address" },
				{ name: "value", type: "uint256" },
				{ name: "nonce", type: "uint256" },
				{ name: "deadline", type: "uint256" },
			],
		};

		const permit = {
			owner: _owner,
			spender: spender,
			value: value,
			nonce: nonce.sub(1),
			deadline: deadline,
		};

		const signature = await userB._signTypedData(domain, types, permit);
		const sig = ethers.utils.splitSignature(signature);

		await expect(
			ERC20.permit(_owner, spender, value, deadline, sig.v, sig.r, sig.s)
		).to.be.revertedWithCustomError(ERC20, "ERC2612ExpiredSignature");
	});

	it("Should not be able to use a permit with the wrong signer", async () => {
		const _owner = userB.address;
		const spender = userA.address;
		const value = 1000;
		const nonce = await ERC20.nonces(_owner);
		const deadline = (await ethers.provider.getBlock("latest")).timestamp - 1;

		const domain = {
			name: tokenName,
			version: "1",
			chainId: (await ethers.provider.getNetwork()).chainId,
			verifyingContract: ERC20.address,
		};

		const types = {
			Permit: [
				{ name: "owner", type: "address" },
				{ name: "spender", type: "address" },
				{ name: "value", type: "uint256" },
				{ name: "nonce", type: "uint256" },
				{ name: "deadline", type: "uint256" },
			],
		};

		const permit = {
			owner: _owner,
			spender: spender,
			value: value,
			nonce: nonce.sub(1),
			deadline: deadline,
		};

		const signature = await userA._signTypedData(domain, types, permit);
		const sig = ethers.utils.splitSignature(signature);

		await expect(
			ERC20.permit(_owner, spender, value, deadline, sig.v, sig.r, sig.s)
		).to.be.revertedWithCustomError(ERC20, "ERC2612ExpiredSignature");
	});
});
