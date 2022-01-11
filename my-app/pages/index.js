import { Contract, providers, utils, BigNumber } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import styles from "../styles/Home.module.css";
import {
  EXCHANGE_CONTRACT_ABI,
  EXCHANGE_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";

export default function Home() {
  // walletConnected keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  // loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false);

  const [liquidityTab, setLiquidityTab] = useState(false);
  const [swapTab, setSwapTab] = useState(false);
  const zero = BigNumber.from(0);
  const [etherAmount, setEtherAmount] = useState(zero);
  const [cryptoDevTokenAmount, setCryptoDevTokenAmount] = useState(zero);
  const [lpCryptoDevTokenAmount, setLPCryptoDevTokenAmount] = useState(zero);
  const [addEtherLiquidityAmount, setAddEtherLiquidityAmount] = useState("0");
  const [addCryptoDevTokenAmount, setAddCryptoDevTokenAmount] = useState("0");
  const [removeLPTokens, setRemoveLPTokens] = useState("0");
  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();

  const getEtherAmount = async () => {
    try {
      const provider = await getProviderOrSigner(false);
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
      setEtherAmount(balance);
    } catch (err) {
      console.error(err);
    }
  };

  const getCryptoDevTokensAmount = async () => {
    try {
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      const signer = await getProviderOrSigner(true);
      // Get the address associated to the signer which is connected to  MetaMask
      const address = await signer.getAddress();
      const balanceOfCryptoDevTokens = await tokenContract.balanceOf(address);
      setCryptoDevTokenAmount(balanceOfCryptoDevTokens);
    } catch (err) {
      console.error(err);
    }
  };

  const getLPCryptoDevTokensAmount = async () => {
    try {
      const provider = await getProviderOrSigner();
      const exchangeContract = new Contract(
        EXCHANGE_CONTRACT_ADDRESS,
        EXCHANGE_CONTRACT_ABI,
        provider
      );
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();
      const balanceOfLPTokens = await exchangeContract.balanceOf(address);
      setLPCryptoDevTokenAmount(balanceOfLPTokens);
    } catch (err) {
      console.error(err);
    }
  };

  const addLiquidity = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      const exchangeContract = new Contract(
        EXCHANGE_CONTRACT_ADDRESS,
        EXCHANGE_CONTRACT_ABI,
        signer
      );
      const addCryptoDevTokenAmountWei = utils.parseEther(
        addCryptoDevTokenAmount
      );
      let tx = await tokenContract.approve(
        EXCHANGE_CONTRACT_ADDRESS,
        addCryptoDevTokenAmountWei
      );
      setLoading(true);
      await tx.wait();
      setLoading(false);
      tx = await exchangeContract.addLiquidity(addCryptoDevTokenAmountWei, {
        value: utils.parseEther(addEtherLiquidityAmount),
      });
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await getEtherAmount();
      await getCryptoDevTokensAmount();
      await getLPCryptoDevTokensAmount();
    } catch (err) {
      console.error(err);
    }
  };

  const removeLiquidity = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const exchangeContract = new Contract(
        EXCHANGE_CONTRACT_ADDRESS,
        EXCHANGE_CONTRACT_ABI,
        signer
      );
      const tx = await exchangeContract.removeLiquidity(
        utils.parseEther(removeLPTokens)
      );
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await getEtherAmount();
      await getCryptoDevTokensAmount();
      await getLPCryptoDevTokensAmount();
    } catch (err) {
      console.error(err);
    }
  };

  /*
      connectWallet: Connects the MetaMask wallet
  */
  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // When used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Returns a Provider or Signer object representing the Ethereum RPC with or without the
   * signing capabilities of metamask attached
   *
   * A `Provider` is needed to interact with the blockchain - reading transactions, reading balances, reading state, etc.
   *
   * A `Signer` is a special type of Provider used in case a `write` transaction needs to be made to the blockchain, which involves the connected account
   * needing to make a digital signature to authorize the transaction being sent. Metamask exposes a Signer API to allow your website to
   * request signatures from the user using Signer functions.
   *
   * @param {*} needSigner - True if you need the signer, default false otherwise
   */
  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Rinkeby network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Change the network to Rinkeby");
      throw new Error("Change network to Rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  // useEffects are used to react to changes in state of the website
  // The array at the end of function call represents what state changes will trigger this effect
  // In this case, whenever the value of `walletConnected` changes - this effect will be called
  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getEtherAmount();
      getCryptoDevTokensAmount();
      getLPCryptoDevTokensAmount();
    }
  }, [walletConnected]);

  /*
      renderButton: Returns a button based on the state of the dapp
    */
  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wllet
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }

    // If we are currently waiting for something, return a loading button
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    if (liquidityTab) {
      return (
        <div>
          <div className={styles.description}>
            You have:
            <br />
            {utils.formatEther(cryptoDevTokenAmount)} Crypto Dev Tokens
            <br />
            {utils.formatEther(etherAmount)} Ether
            <br />
            {utils.formatEther(lpCryptoDevTokenAmount)} Crypto Dev LP tokens
          </div>
          <div>
            <input
              type="number"
              placeholder="Amount of Ether"
              onChange={(e) => setAddEtherLiquidityAmount(e.target.value)}
              className={styles.input}
            />
            <input
              type="number"
              placeholder="Amount of CryptoDev tokens"
              onChange={(e) => setAddCryptoDevTokenAmount(e.target.value)}
              className={styles.input}
            />
            <button className={styles.button} onClick={() => addLiquidity()}>
              Add
            </button>
          </div>
          <div>
            <input
              type="number"
              placeholder="Amount of LP Tokens"
              onChange={(e) => setRemoveLPTokens(e.target.value)}
              className={styles.input}
            />
            <button className={styles.button} onClick={() => removeLiquidity()}>
              Remove
            </button>
          </div>
        </div>
      );
    }

    if (swapTab) {
      return <div>swap token</div>;
    }
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs Exchange!</h1>
          <div className={styles.description}>
            Exchange Ethereum &#60;&#62; Crypto Dev Tokens
          </div>
          <div>
            <button
              className={styles.button}
              onClick={() => {
                setLiquidityTab(!liquidityTab);
                setSwapTab(false);
              }}
            >
              Liquidity
            </button>
            <button
              className={styles.button}
              onClick={() => {
                setSwapTab(!swapTab);
                setLiquidityTab(false);
              }}
            >
              Swap
            </button>
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./cryptodev.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );
}
