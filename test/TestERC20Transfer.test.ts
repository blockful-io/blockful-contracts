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

	it("Should transfer 100 tokens from userA to userB", async () => {
		await expect(ERC20.connect(userA).transfer(userB.address, 100))
			.to.emit(ERC20, "Transfer")
			.withArgs(userA.address, userB.address, 100);
	});

	it("Should transfer 100 tokens from userA to address zero", async () => {
		await expect(
			ERC20.connect(userA).transfer(ethers.constants.AddressZero, 100)
		)
			.to.emit(ERC20, "Transfer")
			.withArgs(userA.address, ethers.constants.AddressZero, 100);
	});

	it("Should transfer 100 tokens from userA to userA", async () => {
		await expect(ERC20.connect(userA).transfer(userA.address, 100))
			.to.emit(ERC20, "Transfer")
			.withArgs(userA.address, userA.address, 100);
	});

	it("Should not transfer more tokens than owned from userA to userB", async () => {
		const balanceOf = await ERC20.balanceOf(userA.address);
		await expect(
			ERC20.connect(userA).transfer(userB.address, balanceOf.add(1000))
		).to.be.revertedWithCustomError(ERC20, "ERC20InsufficientBalance");
	});

	it("Should not transfer 100 tokens from userA to userB as userB without approval", async () => {
		await expect(
			ERC20.connect(userB).transferFrom(userA.address, userB.address, 100)
		).to.be.revertedWithCustomError(ERC20, "ERC20InsufficientAllowance");
	});

	it("Should not transfer 100 tokens from userA to userB as userB without approval", async () => {
		await expect(
			ERC20.connect(userB).transferFrom(userA.address, userB.address, 100)
		).to.be.revertedWithCustomError(ERC20, "ERC20InsufficientAllowance");
	});

	it("Should transfer 100 tokens from userA to userB as userB with approval", async () => {
		await ERC20.connect(userA).approve(userB.address, 100);
		await expect(
			ERC20.connect(userB).transferFrom(userA.address, userB.address, 100)
		)
			.to.emit(ERC20, "Transfer")
			.withArgs(userA.address, userB.address, 100);
	});

	it("Should not transfer more tokens than allowed from userA to userB as userB", async () => {
		await ERC20.connect(userA).approve(userB.address, 100);
		await expect(
			ERC20.connect(userB).transferFrom(userA.address, userB.address, 150)
		).to.be.revertedWithCustomError(ERC20, "ERC20InsufficientAllowance");
	});

	it("Should transfer 100 tokens from userA to userB as userB with permit", async () => {
		const _owner = userA.address;
		const spender = userB.address;
		const value = 100;
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

		const signature = await userA._signTypedData(domain, types, permit);
		const sig = ethers.utils.splitSignature(signature);

		await ERC20.permit(_owner, spender, value, deadline, sig.v, sig.r, sig.s);

		expect(await ERC20.allowance(_owner, spender)).to.equal(value.toString());

		await expect(
			ERC20.connect(userB).transferFrom(userA.address, userB.address, 100)
		)
			.to.emit(ERC20, "Transfer")
			.withArgs(userA.address, userB.address, 100);

		expect(await ERC20.allowance(_owner, spender)).to.be.equal(0);
	});

	it("Should transfer 100 tokens from userA to userB as userB with permitTransfer", async () => {
		const _owner = userA.address;
		const spender = userB.address;
		const value = 100;
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

		const signature = await userA._signTypedData(domain, types, permit);
		const sig = ethers.utils.splitSignature(signature);

		await expect(
			ERC20.connect(userB).permitTransfer(
				_owner,
				spender,
				value,
				deadline,
				sig.v,
				sig.r,
				sig.s
			)
		)
			.to.emit(ERC20, "Transfer")
			.withArgs(userA.address, userB.address, 100);
	});

	it("Should not transfer more tokens than owned from userA to userB as userB with permitTransfer", async () => {
		const _owner = userA.address;
		const spender = userB.address;
		const value = (await ERC20.balanceOf(_owner)).mul(2);
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

		const signature = await userA._signTypedData(domain, types, permit);
		const sig = ethers.utils.splitSignature(signature);

		await expect(
			ERC20.connect(userB).permitTransfer(
				_owner,
				spender,
				value,
				deadline,
				sig.v,
				sig.r,
				sig.s
			)
		).to.revertedWithCustomError(ERC20, "ERC20InsufficientBalance");
	});

	it("Should not be able to permitTransfer with expired permit", async () => {
		const _owner = userA.address;
		const spender = userB.address;
		const value = 100;
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
			nonce: nonce,
			deadline: deadline,
		};

		const signature = await userA._signTypedData(domain, types, permit);
		const sig = ethers.utils.splitSignature(signature);

		await expect(
			ERC20.connect(userB).permitTransfer(
				_owner,
				spender,
				value,
				deadline,
				sig.v,
				sig.r,
				sig.s
			)
		).to.be.revertedWithCustomError(ERC20, "ERC2612ExpiredSignature");
	});

	it("Should not transfer 100 tokens from userA to userB signing as userB with permitTransfer", async () => {
		const _owner = userA.address;
		const spender = userB.address;
		const value = 100;
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

		await expect(
			ERC20.connect(userB).permitTransfer(
				_owner,
				spender,
				value,
				deadline,
				sig.v,
				sig.r,
				sig.s
			)
		).to.be.revertedWithCustomError(ERC20, "ERC2612InvalidSigner");
	});
});
