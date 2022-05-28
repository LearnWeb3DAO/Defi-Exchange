import { Contract } from "ethers";
import {
  EXCHANGE_CONTRACT_ABI,
  EXCHANGE_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";

/**
 * getEtherBalance: Retrieves the ether balance of the user or the contract
 */
export const getEtherBalance = async (provider, address, contract = false) => {
  try {
    // If the caller has set the `contract` boolean to true, retrieve the balance of
    // ether in the `exchange contract`, if it is set to false, retrieve the balance
    // of the user's address
    if (contract) {
      const balance = await provider.getBalance(EXCHANGE_CONTRACT_ADDRESS);
      return balance;
    } else {
      const balance = await provider.getBalance(address);
      return balance;
    }
  } catch (err) {
    console.error(err);
    return 0;
  }
};

/**
 * getCDTokensBalance: Retrieves the Crypto Dev tokens in the account
 * of the provided `address`
 */
export const getCDTokensBalance = async (provider, address) => {
  try {
    const tokenContract = new Contract(
      TOKEN_CONTRACT_ADDRESS,
      TOKEN_CONTRACT_ABI,
      provider
    );
    const balanceOfCryptoDevTokens = await tokenContract.balanceOf(address);
    return balanceOfCryptoDevTokens;
  } catch (err) {
    console.error(err);
  }
};

/**
 * getLPTokensBalance: Retrieves the amount of LP tokens in the account
 * of the provided `address`
 */
export const getLPTokensBalance = async (provider, address) => {
  try {
    const exchangeContract = new Contract(
      EXCHANGE_CONTRACT_ADDRESS,
      EXCHANGE_CONTRACT_ABI,
      provider
    );
    const balanceOfLPTokens = await exchangeContract.balanceOf(address);
    return balanceOfLPTokens;
  } catch (err) {
    console.error(err);
  }
};

/**
 * getReserveOfCDTokens: Retrieves the amount of CD tokens in the
 * exchange contract address
 */
export const getReserveOfCDTokens = async (provider) => {
  try {
    const exchangeContract = new Contract(
      EXCHANGE_CONTRACT_ADDRESS,
      EXCHANGE_CONTRACT_ABI,
      provider
    );
    const reserve = await exchangeContract.getReserve();
    return reserve;
  } catch (err) {
    console.error(err);
  }
};
