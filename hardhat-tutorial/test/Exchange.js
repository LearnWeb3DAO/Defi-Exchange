const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

async function deployExchangeAndICOAndWhitelist() {
  const [owner, otherAccount] = await ethers.getSigners();

  const maxWhitelistedAddresses = 25
  const Whitelist = await ethers.getContractFactory("Whitelist");
  const whitelist = await Whitelist.deploy(maxWhitelistedAddresses);

  // add wallet to whitelist
  await whitelist.addAddressToWhitelist()

  // ERC721 Contract
  const baseURI= 'www.test.com'
  const CryptoDevs = await ethers.getContractFactory("CryptoDevs");
  const cryptoDevs = await CryptoDevs.deploy(baseURI, whitelist.address);

  // ERC20 Contract
  const CryptoDevToken = await ethers.getContractFactory("CryptoDevToken");
  const cryptoDevToken = await CryptoDevToken.deploy(cryptoDevs.address);

  // Already load Owner acount with 100CD
  // Each CD is 0.001 ether
  await cryptoDevToken.mint(100, { value: ethers.utils.parseEther('0.1') })

  // The contract we are testing here
  const Exchange = await ethers.getContractFactory("Exchange");
  const exchange = await Exchange.deploy(cryptoDevToken.address);


  return { exchange, cryptoDevToken, cryptoDevs, whitelist, owner, otherAccount };
}

describe("Exchange addLiquidity", function () {
  it('Should be able to add initial liquidity', async() => {
    const { exchange, cryptoDevToken, cryptoDevs, whitelist, owner, otherAccount } = await loadFixture(deployExchangeAndICOAndWhitelist);

    const cryptoDevTokenAmount = ethers.utils.parseEther('10')
    const ethAmount = ethers.utils.parseEther('10')

    // We need to approve the spend, cause its an ERC20 coin
    await cryptoDevToken.approve(exchange.address, cryptoDevTokenAmount)

    await exchange.addLiquidity(cryptoDevTokenAmount, { value: ethAmount })

    const balanceOfLiquidityToken = await exchange.balanceOf(owner.address)
    expect(balanceOfLiquidityToken).to.be.equal(ethers.utils.parseEther('10'))
  })

  it('Should be able to add liquidity', async() => {
    const { exchange, cryptoDevToken, cryptoDevs, whitelist, owner, otherAccount } = await loadFixture(deployExchangeAndICOAndWhitelist);

    // Adding first liquidity
    const cryptoDevTokenAmount = ethers.utils.parseEther('10')
    const ethAmount = ethers.utils.parseEther('10')

    // We need to approve the spend, cause its an ERC20 coin
    await cryptoDevToken.approve(exchange.address, cryptoDevTokenAmount)

    await exchange.addLiquidity(cryptoDevTokenAmount, { value: ethAmount })

    // Adding extra liquidity

    await cryptoDevToken.approve(exchange.address, cryptoDevTokenAmount)
    await exchange.addLiquidity(cryptoDevTokenAmount, { value: ethAmount })

    const balanceOfLiquidityToken = await exchange.balanceOf(owner.address)
    expect(balanceOfLiquidityToken).to.be.equal(ethers.utils.parseEther('20'))
  })

  it('Should not be able to break the ratio', async() => {

    const { exchange, cryptoDevToken, cryptoDevs, whitelist, owner, otherAccount } = await loadFixture(deployExchangeAndICOAndWhitelist);

    // Adding first liquidity
    const cryptoDevTokenAmount = ethers.utils.parseEther('10')
    const ethAmount = ethers.utils.parseEther('10')

    // We need to approve the spend, cause its an ERC20 coin
    await cryptoDevToken.approve(exchange.address, cryptoDevTokenAmount)

    await exchange.addLiquidity(cryptoDevTokenAmount, { value: ethAmount })

    // Adding extra liquidity
    await cryptoDevToken.approve(exchange.address, cryptoDevTokenAmount)
    await expect(exchange.addLiquidity(cryptoDevTokenAmount, { value: ethers.utils.parseEther('50') })).to.be.revertedWith("Amount of tokens sent is less than the minimum tokens required");

  })
})

describe("Exchange removeLiquidity", function () {
  it('Should be able to remove liquidity', async() => {
    const { exchange, cryptoDevToken, cryptoDevs, whitelist, owner, otherAccount } = await loadFixture(deployExchangeAndICOAndWhitelist);

    // Adding first liquidity
    const cryptoDevTokenAmount = ethers.utils.parseEther('10')
    const ethAmount = ethers.utils.parseEther('10')

    // We need to approve the spend, cause its an ERC20 coin
    await cryptoDevToken.approve(exchange.address, cryptoDevTokenAmount)

    await exchange.addLiquidity(cryptoDevTokenAmount, { value: ethAmount })

    // removing liquidity

    //Tokens Owner has
    const ownerEthBalanceBefore = await ethers.provider.getBalance(owner.address);

    // We are returning all our LP tokens
    const transactionResponse = await exchange.removeLiquidity(ethers.utils.parseEther('10'))
    // extract the gas cost of the withdraw transaction
    const transactionReceipt = await transactionResponse.wait()
    const { gasUsed, effectiveGasPrice } = transactionReceipt
    const gasCost = gasUsed.mul(effectiveGasPrice)

    // So we can be sure that they burned
    const totalLPTokensSupplyAfter = await exchange.totalSupply()

    const ownerCryptoDevTokenBalanceAfter = await cryptoDevToken.balanceOf(owner.address)

    expect(ownerCryptoDevTokenBalanceAfter).to.be.equal(ethers.utils.parseEther('100'))

    const finalOwnerBalanceMath = ownerEthBalanceBefore.add(ethers.utils.parseEther("10")).sub(gasCost)

    const ownerEthBalanceAfter = await ethers.provider.getBalance(owner.address);

    expect(ownerEthBalanceAfter).to.be.equal(finalOwnerBalanceMath)
  })
})

describe("Exchange ethToCryptoDevToken", function () {
  it('Should be able swap ethToCryptoDevToken', async() => {
    const { exchange, cryptoDevToken, cryptoDevs, whitelist, owner, otherAccount } = await loadFixture(deployExchangeAndICOAndWhitelist);

    // Adding first liquidity
    const cryptoDevTokenAmount = ethers.utils.parseEther('10')
    const ethAmount = ethers.utils.parseEther('10')

    // We need to approve the spend, cause its an ERC20 coin
    await cryptoDevToken.approve(exchange.address, cryptoDevTokenAmount)

    await exchange.addLiquidity(cryptoDevTokenAmount, { value: ethAmount })

    // Start of the test
    // We want to add 10 eth to the pool and have Crypto Devs token in return
    const ownerCryptoDevTokenBalanceBefore = await cryptoDevToken.balanceOf(owner.address)

    const amountOfTokens = await exchange.getAmountOfTokens(ethers.utils.parseEther('10'), ethers.provider.getBalance(exchange.address), exchange.getReserve())
    console.log('amountOfTokens', amountOfTokens)

    await exchange.ethToCryptoDevToken(amountOfTokens, { value: ethers.utils.parseEther('10') })

    const ownerCryptoDevTokenBalanceAfter = await cryptoDevToken.balanceOf(owner.address)
    const finalOwnerBalanceMath = ownerCryptoDevTokenBalanceBefore.add(amountOfTokens)

    expect(ownerCryptoDevTokenBalanceAfter).to.be.equal(finalOwnerBalanceMath)
  })

})


describe("Exchange cryptoDevTokenToEth", function () {
  it('Should be able swap cryptoDevTokenToEth', async() => {
    const { exchange, cryptoDevToken, cryptoDevs, whitelist, owner, otherAccount } = await loadFixture(deployExchangeAndICOAndWhitelist);

    // Adding first liquidity
    const cryptoDevTokenAmount = ethers.utils.parseEther('10')
    const ethAmount = ethers.utils.parseEther('10')

    // We need to approve the spend, cause its an ERC20 coin
    await cryptoDevToken.approve(exchange.address, cryptoDevTokenAmount)

    await exchange.addLiquidity(cryptoDevTokenAmount, { value: ethAmount })

    // Start of the test
    // We want to add 1 Crypto Devs token to the pool and have eth token in return

    const amountOfTokens = await exchange.getAmountOfTokens(ethers.utils.parseEther('1'), exchange.getReserve(), ethers.provider.getBalance(exchange.address))
    console.log('amountOfTokens', amountOfTokens)

    await cryptoDevToken.approve(exchange.address, ethers.utils.parseEther('1'))

    const ownerEthBalanceBefore = await ethers.provider.getBalance(owner.address)

    const transactionResponse = await exchange.cryptoDevTokenToEth(ethers.utils.parseEther('1'), amountOfTokens)

     // extract the gas cost of the withdraw transaction
     const transactionReceipt = await transactionResponse.wait()
     const { gasUsed, effectiveGasPrice } = transactionReceipt
     const gasCost = gasUsed.mul(effectiveGasPrice)
 
    const ownerCryptoDevTokenBalanceAfter = await ethers.provider.getBalance(owner.address)
    const finalOwnerBalanceMath = ownerEthBalanceBefore.add(amountOfTokens).sub(gasCost)

    expect(ownerCryptoDevTokenBalanceAfter).to.be.equal(finalOwnerBalanceMath)
  })

})


describe("Exchange getAmountOfTokens", function () {
  it.only('Should make the token math correctly', async() => {
    const { exchange } = await loadFixture(deployExchangeAndICOAndWhitelist);
    const amountOfToken = await exchange.getAmountOfTokens(ethers.utils.parseEther('1'), ethers.utils.parseEther('100'), ethers.utils.parseEther('100'))
    expect(amountOfToken).to.be.equal('980295078720665412')
  })
})

