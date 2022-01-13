# DeFi-Exchange

Now its time for you to launch a DeFi Exchange for your `Crypto Dev` tokens

---

## Requirements

- Build an exhange with only one asset pair (Eth <> Crypto Dev)
- Your NFT Collection should take a fees of `1%` on swaps
- When user adds liquidity, they should be given `Crypto Dev LP` tokens (Liquidity Provider tokens)
- CD LP tokens should be given propotional to the `Ether` user is willing to add to the liquidity

Lets start building 🚀

---

## Prerequisites

- You have completed the [ICO tutorial](https://github.com/LearnWeb3DAO/ICO)
- You have completed the [Defo Exchange Theory Tutorial](https://github.com/LearnWeb3DAO/Defi-Exchange-Theory)
- You have completed the [Common Topics Tutorial](https://github.com/LearnWeb3DAO/Common-Topics)

---

### Smart Contract

To build the smart contract we would be using [Hardhat](https://hardhat.org/).
Hardhat is an Ethereum development environment and framework designed for full stack development in Solidity. In simple words you can write your smart contract, deploy them, run tests, and debug your code.

- To setup a Hardhat project, Open up a terminal and execute these commands

  ```bash
  mkdir hardhat-tutorial
  cd hardhat-tutorial
  npm init --yes
  npm install --save-dev hardhat
  ```

- In the same directory where you installed Hardhat run:

  ```bash
  npx hardhat
  ```

  - Select `Create a basic sample project`
  - Press enter for the already specified `Hardhat Project root`
  - Press enter for the question on if you want to add a `.gitignore`
  - Press enter for `Do you want to install this sample project's dependencies with npm (@nomiclabs/hardhat-waffle ethereum-waffle chai @nomiclabs/hardhat-ethers ethers)?`

- Now you have a hardhat project ready to go!

- If you are not on mac, please do this extra step and install these libraries as well :)

  ```bash
  npm install --save-dev @nomiclabs/hardhat-waffle ethereum-waffle chai @nomiclabs/hardhat-ethers ethers
  ```

- In the same terminal now install `@openzeppelin/contracts` as we would be importing [Openzeppelin's ERC20 Contract](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol) in our `Exchange` contract

  ```bash
  npm install @openzeppelin/contracts
  ```

- Create a new file inside the `contracts` directory called `Exchange.sol`. In this tutorial we would cover each part of the contract seperately

  - First lets start by importing `ERC20.sol`

    - We imported `ERC20.sol` because our Exchange needs to mint and create `Crypto Dev LP` tokens thats why it needs to inherit ERC20.sol

    ```go
            // SPDX-License-Identifier: MIT
            pragma solidity ^0.8.4;

            import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

            contract Exchange is ERC20 {
            }
    ```

  - Now lets create a `constructor` for our contract

    - It takes the address of the `_CryptoDevToken` that you deployed in the `ICO` tutorial as an input param
    - It then checks if the address is a null address
    - After all the checks, it assigns the value to the input param to the `cryptoDevTokenAddress` variable
    - Constructor also sets the `name` and `symbol` for our `Crypto Dev LP` token

    ```go
    // SPDX-License-Identifier: MIT

    pragma solidity ^0.8.4;
    import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

    contract Exchange is ERC20 {

        address public cryptoDevTokenAddress;

        // Exchange is inheriting ERC20, becase our exchange would keep track of Crypto Dev LP tokens
        constructor(address _CryptoDevtoken) ERC20("CryptoDev LP Token", "CDLP") {
            require(_CryptoDevtoken != address(0), "Token address passed is a null address");
            cryptoDevTokenAddress = _CryptoDevtoken;
        }
    }
    ```

  - Time to create a function to get reserves of the `Eth` and `Crypto Dev` tokens held
    by the contract.

    - Eth reserve as we all know would be equal to the balance of the contract and can be found using `address(this).balance` so lets just create a function only for getting reserves of the `Crypto Dev` tokens
    - We know that the `Crypto Dev Token` contract that we deployed is an ERC20
    - so we can just call the `balanceOf` to check the balance of `CryptoDev Tokens`
      that the contract `address` holds

    ```go
    /**
    *  @dev Returns the amount of `Crypto Dev Tokens` held by the contract
    */
    function getReserve() public view returns (uint) {
        return ERC20(cryptoDevTokenAddress).balanceOf(address(this));
    }
    ```

  - Time to create an `addLiquidity` function which would add `liquidity` in the form of `Ether` and `Crypto Dev tokens` to our contract

    - If `cryptoDevTokenReserve` is zero it means that it is the first time someone is adding `Crypto Dev`tokens and `Ether` to the contract
    - When the user is adding initial liquidity we dont have to maintain any ratio because
      we dont have any liquidity. So we accept any amount of tokens that user has sent with the initial call
    - if `cryptoDevTokenReserve` is not zero, then we have to make sure that when someone adds the liquidity it doesnt impact the price which the market currently has
    - To ensure this, we maintain a ratio which has to remain constant
    - Ratio is `(cryptoDevTokenAmount user can add/cryptoDevTokenReserve in the contract) = (Eth Sent by the user/Eth Reserve in the contract)`
    - This ratio decides how much `Crypto Dev` tokens user can supply given a certain amount of Eth
    - When user adds liquidity, we need to provide him with some `LP` tokens because we need to keep track of the amount of liquiidty he has supplied to the contract
    - The amount of `LP` tokens that get minted to the user are propotional to the `Eth` supplied by the user
    - In the inital liquidity case,when there is no liquidity. The amount of `LP` tokens that would be minted to the user is equal to the ethBalance of the contract(because balance is equal to the Eth sent by the user in the `addLiquidity` call)
    - When there is already liquidity in the contract, the amount of `LP` tokens that get minted are based on a ratio.
    - The ratio is `(lp tokens to be sent to the user(liquidity)/ totalSupply of LP tokens in contract) = (eth sent by the user)/(eth reserve in the contract)`

      ```go
      /**
      * @dev Adds liquidity to the exchange.
      */
      function addLiquidity(uint _amount) public payable returns (uint) {
          uint liquidity;
          uint ethBalance = address(this).balance;
          uint cryptoDevTokenReserve = getReserve();
          ERC20 cryptoDevToken = ERC20(cryptoDevTokenAddress);
          /*
              If the reserve is empty, intake any user supplied value for
              `Ether` and `Crypto Dev` tokens because there is no ratio currently
          */
          if(cryptoDevTokenReserve == 0) {
              // Transfer the `cryptoDevToken` address from the user's account to the contract
              cryptoDevToken.transferFrom(msg.sender, address(this), _amount);
              // Take the current ethBalance and mint `ethBalance` amount of LP tokens to the user.
              // `liquidity` provided is equal to `ethBalance` because this is the first time user
              // is adding `Eth` to the contract, so whatever `Eth` contract has is equal to the one supplied
              // by the user in the current `addLiquidity` call
              // `liquidity` tokens that need to be minted to the user on `addLiquidity` call shouls always be propotional
              // to the eth specified by the user
              liquidity = ethBalance;
              _mint(msg.sender, liquidity);
          } else {
              /*
                  If the reserve is not empty, intake any user supplied value for
                  `Ether` and determine according to the ratio how many `Crypto Dev` tokens
                  need to be supplied to prevent any large price impacts because of the additional
                  liquidity
              */
              // EthReserve should be the current ethBalance subtracted by the value of ether sent by the user
              // in the current `addLiquidity` call
              uint ethReserve =  ethBalance - msg.value;
              // Ratio should always be maintained so that there are no major price impacts when adding liquidity
              // Ration here is -> (cryptoDevTokenAmount user can add/cryptoDevTokenReserve in the contract) = (Eth Sent by the user/Eth Reserve in the contract);
              // So doing some maths, (cryptoDevTokenAmount user can add) = (Eth Sent by the user * cryptoDevTokenReserve /Eth Reserve);
              uint cryptoDevTokenAmount = (msg.value * cryptoDevTokenReserve)/(ethReserve);
              require(_amount >= cryptoDevTokenAmount, "Amount of tokens sent is less than the minimum tokens required");
              // transfer only (cryptoDevTokenAmount user can add) amount of `Crypto Dev tokens` from users account
              // to the contract
              cryptoDevToken.transferFrom(msg.sender, address(this), cryptoDevTokenAmount);
              // The amount of LP tokens that would be sent to the user should be propotional to the liquidity of
              // ether added by the user
              // Ratio here to be maintained is ->
              // (lp tokens to be sent to the user(liquidity)/ totalSupply of LP tokens in contract) = (eth sent by the user)/(eth reserve in the contract)
              // by some maths -> liquidity =  (totalSupply of LP tokens in contract * (eth sent by the user))/(eth reserve in the contract)
              liquidity = (totalSupply() * msg.value)/ ethReserve;
              _mint(msg.sender, liquidity);
          }
          return liquidity;
      }
      ```

  - Now lets a function for `removing liquidity` from the contract.

    - The amount of ether that would be sent back to the user would be based on a ratio
    - Ratio is `Eth sent back to the user/ Current Eth reserve) = (amount of LP tokens that user wants to withdraw)/ Total supply of `LP` tokens`
    - The amount of Crypto Dev †okens that would be sent back to the user would also be based on a ratio
    - Ration is `(Crypto Dev sent back to the user/ Current Crypto Dev token reserve) = (amount of LP tokens that user wants to withdraw)/ Total supply of `LP` tokens)`
    - The `amount` of `LP` tokens that user would use to remove liquidity would be burnt

    ```go
    /**
    @dev Returns the amount Eth/Crypto Dev tokens that would be returned to the user
    * in the swap
    */
    function removeLiquidity(uint _amount) public returns (uint , uint) {
        require(_amount > 0, "_amount should be greater than zero");
        uint ethReserve = address(this).balance;
        uint _totalSupply = totalSupply();
        // The amount of Eth that would be sent back to the user is based
        // on a ratio
        // Ratio is -> (Eth sent back to the user/ Current Eth reserve)
        // = (amount of LP tokens that user wants to withdraw)/ Total supply of `LP` tokens
        // Then by some maths -> (Eth sent back to the user)
        // = (Current Eth reserve * amount of LP tokens that user wants to withdraw)/Total supply of `LP` tokens
        uint ethAmount = (ethReserve * _amount)/ _totalSupply;
        // The amount of Crypto Dev token that would be sent back to the user is based
        // on a ratio
        // Ratio is -> (Crypto Dev sent back to the user/ Current Crypto Dev token reserve)
        // = (amount of LP tokens that user wants to withdraw)/ Total supply of `LP` tokens
        // Then by some maths -> (Crypto Dev sent back to the user/)
        // = (Current Crypto Dev token reserve * amount of LP tokens that user wants to withdraw)/Total supply of `LP` tokens
        uint cryptoDevTokenAmount = (getReserve() * _amount)/ _totalSupply;
        // Burn the sent `LP` tokens from the user'a wallet because they are already sent to
        // remove liquidity
        _burn(msg.sender, _amount);
        // Transfer `ethAmount` of Eth from user's wallet to the contract
        payable(msg.sender).transfer(ethAmount);
        // Transfer `cryptoDevTokenAmount` of `Crypto Dev` tokens from the user's wallet to the contract
        ERC20(cryptoDevTokenAddress).transfer(msg.sender, cryptoDevTokenAmount);
        return (ethAmount, cryptoDevTokenAmount);
    }
    ```

    - Next lets implement the swap functionality
    - Swap would go two ways one way would be `Ether` to `Crypto Dev` tokens and other would be `Crypto Dev` to `Ether`
    - Its important for us to determine given `x` amount of Ether/Crypto Dev token sent by the user how many Ether/Crypto Dev token would he recieve from the swap
    - So lets create a function which calculates this:
      - We will charge `1%` this means the amount of input tokens with fees would equal
      - `Input amount with fees = (input amount - (1*(input amount)/100)) = ((input amount)*99)/100`
      - We need to follow the concept of `XY = K` curve
      - We need to make sure `(x +Δx)*(y - Δy) = (x)*(y)`,so the final formulae is `Δy = (y*Δx)/(x + Δx)`;
      - Δy in our case is `tokens to be recieved`, Δx = `((input amount)*99)/100, x = inputReserve`, y = `outputReserve`
      - InputReserve and OuputReserve would depend on which swap we are implementing
        `Eth` to `Crypto Dev` token or vice versa

    ```go
       /**
        @dev Returns the amount Eth/Crypto Dev tokens that would be returned to the user
        * in the swap
        */
        function getAmountOfTokens(
            uint256 inputAmount,
            uint256 inputReserve,
            uint256 outputReserve
        ) public pure returns (uint256) {
            require(inputReserve > 0 && outputReserve > 0, "invalid reserves");
            // We are charging a fees of `1%`
            // Input amount with fees = (input amount - (1*(input amount)/100)) = ((input amount)*99)/100
            uint256 inputAmountWithFee = inputAmount * 99;
            // Because we need to follow the concept of `XY = K` curve
            // We need to make sure (x + Δx)*(y - Δy) = (x)*(y)
            // so the final formulae is Δy = (y*Δx)/(x + Δx);
            // Δy in our case is `tokens to be recieved`
            // Δx = ((input amount)*99)/100, x = inputReserve, y = outputReserve
            // So by putting the values in the formulae you can get the numerator and denominator
            uint256 numerator = inputAmountWithFee * outputReserve;
            uint256 denominator = (inputReserve * 100) + inputAmountWithFee;
            return numerator / denominator;
        }
    ```

    - Now lets implement a function to swap `Ether` for `Crypto Dev` tokens

    ```go
        /**
         @dev Swaps Ether for CryptoDev Tokens
        */
        function ethToCryptoDevToken(uint _minTokens) public payable {
        uint256 tokenReserve = getReserve();
        // call the `getAmountOfTokens` to get the amount of crypto dev tokens
        // that would be returned to the user after the swap
        // Notice that the `inputReserve` we are sending is equal to
        //  `address(this).balance - msg.value` instead of just `address(this).balance`
        // because `address(this).balance` already contains the `msg.value` user has sent in the given call
        // so we need to subtract it to get the actual input reserve
        uint256 tokensBought = getAmountOfTokens(
            msg.value,
            address(this).balance - msg.value,
            tokenReserve
        );

        require(tokensBought >= _minTokens, "insufficient output amount");
        // Transfer the `Crypto Dev` tokens to the user
        ERC20(cryptoDevTokenAddress).transfer(msg.sender, tokensBought);
        }
    ```

    - Now lets implement a function to swap `Crypto Dev` tokens to `Ether`

    ```go
        /**
        @dev Swaps CryptoDev Tokens for Ether
        */
        function cryptoDevTokenToEth(uint _tokensSold, uint _minEth) public {
        uint256 tokenReserve = getReserve();
            // call the `getAmountOfTokens` to get the amount of ether
            // that would be returned to the user after the swap
            uint256 ethBought = getAmountOfTokens(
                _tokensSold,
                tokenReserve,
                address(this).balance
            );
            require(ethBought >= _minEth, "insufficient output amount");
            // Transfer `Crypto Dev` tokens from the user's address to the contract
            ERC20(cryptoDevTokenAddress).transferFrom(
                msg.sender,
                address(this),
                _tokensSold
            );
            // send the `ethBought` to the user from the contract
            payable(msg.sender).transfer(ethBought);
        }
    ```

- Your final contract should look like this:

  ```go
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.4;
  import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

  contract Exchange is ERC20 {

    address public cryptoDevTokenAddress;

    // Exchange is inheriting ERC20, becase our exchange would keep track of Crypto Dev LP tokens
    constructor(address _CryptoDevtoken) ERC20("CryptoDev LP Token", "CDLP") {
        require(_CryptoDevtoken != address(0), "Token address passed is a null address");
        cryptoDevTokenAddress = _CryptoDevtoken;
    }

    /**
    *  @dev Returns the amount of `Crypto Dev Tokens` held by the contract
    */
    function getReserve() public view returns (uint) {
        return ERC20(cryptoDevTokenAddress).balanceOf(address(this));
    }

    /**
    * @dev Adds liquidity to the exchange.
    */
    function addLiquidity(uint _amount) public payable returns (uint) {
        uint liquidity;
        uint ethBalance = address(this).balance;
        uint cryptoDevTokenReserve = getReserve();
        ERC20 cryptoDevToken = ERC20(cryptoDevTokenAddress);
        /*
            If the reserve is empty, intake any user supplied value for
            `Ether` and `Crypto Dev` tokens because there is no ratio currently
        */
        if(cryptoDevTokenReserve == 0) {
            // Transfer the `cryptoDevToken` address from the user's account to the contract
            cryptoDevToken.transferFrom(msg.sender, address(this), _amount);
            // Take the current ethBalance and mint `ethBalance` amount of LP tokens to the user.
            // `liquidity` provided is equal to `ethBalance` because this is the first time user
            // is adding `Eth` to the contract, so whatever `Eth` contract has is equal to the one supplied
            // by the user in the current `addLiquidity` call
            // `liquidity` tokens that need to be minted to the user on `addLiquidity` call shouls always be propotional
            // to the eth specified by the user
            liquidity = ethBalance;
            _mint(msg.sender, liquidity);
        } else {
            /*
                If the reserve is not empty, intake any user supplied value for
                `Ether` and determine according to the ratio how many `Crypto Dev` tokens
                need to be supplied to prevent any large price impacts because of the additional
                liquidity
            */
            // EthReserve should be the current ethBalance subtracted by the value of ether sent by the user
            // in the current `addLiquidity` call
            uint ethReserve =  ethBalance - msg.value;
            // Ratio should always be maintained so that there are no major price impacts when adding liquidity
            // Ration here is -> (cryptoDevTokenAmount user can add/cryptoDevTokenReserve in the contract) = (Eth Sent by the user/Eth Reserve in the contract);
            // So doing some maths, (cryptoDevTokenAmount user can add) = (Eth Sent by the user * cryptoDevTokenReserve /Eth Reserve);
            uint cryptoDevTokenAmount = (msg.value * cryptoDevTokenReserve)/(ethReserve);
            require(_amount >= cryptoDevTokenAmount, "Amount of tokens sent is less than the minimum tokens required");
            // transfer only (cryptoDevTokenAmount user can add) amount of `Crypto Dev tokens` from users account
            // to the contract
            cryptoDevToken.transferFrom(msg.sender, address(this), cryptoDevTokenAmount);
            // The amount of LP tokens that would be sent to the user should be propotional to the liquidity of
            // ether added by the user
            // Ratio here to be maintained is ->
            // (lp tokens to be sent to the user(liquidity)/ totalSupply of LP tokens in contract) = (eth sent by the user)/(eth reserve in the contract)
            // by some maths -> liquidity =  (totalSupply of LP tokens in contract * (eth sent by the user))/(eth reserve in the contract)
            liquidity = (totalSupply() * msg.value)/ ethReserve;
            _mint(msg.sender, liquidity);
        }
         return liquidity;
    }

    /**
        @dev Returns the amount Eth/Crypto Dev tokens that would be returned to the user
        * in the swap
    */
    function removeLiquidity(uint _amount) public returns (uint , uint) {
        require(_amount > 0, "_amount should be greater than zero");
        uint ethReserve = address(this).balance;
        uint _totalSupply = totalSupply();
        // The amount of Eth that would be sent back to the user is based
        // on a ratio
        // Ratio is -> (Eth sent back to the user/ Current Eth reserve)
        // = (amount of LP tokens that user wants to withdraw)/ Total supply of `LP` tokens
        // Then by some maths -> (Eth sent back to the user)
        // = (Current Eth reserve * amount of LP tokens that user wants to withdraw)/Total supply of `LP` tokens
        uint ethAmount = (ethReserve * _amount)/ _totalSupply;
        // The amount of Crypto Dev token that would be sent back to the user is based
        // on a ratio
        // Ratio is -> (Crypto Dev sent back to the user/ Current Crypto Dev token reserve)
        // = (amount of LP tokens that user wants to withdraw)/ Total supply of `LP` tokens
        // Then by some maths -> (Crypto Dev sent back to the user/)
        // = (Current Crypto Dev token reserve * amount of LP tokens that user wants to withdraw)/Total supply of `LP` tokens
        uint cryptoDevTokenAmount = (getReserve() * _amount)/ _totalSupply;
        // Burn the sent `LP` tokens from the user'a wallet because they are already sent to
        // remove liquidity
        _burn(msg.sender, _amount);
        // Transfer `ethAmount` of Eth from user's wallet to the contract
        payable(msg.sender).transfer(ethAmount);
        // Transfer `cryptoDevTokenAmount` of `Crypto Dev` tokens from the user's wallet to the contract
        ERC20(cryptoDevTokenAddress).transfer(msg.sender, cryptoDevTokenAmount);
        return (ethAmount, cryptoDevTokenAmount);
    }

    /**
    @dev Returns the amount Eth/Crypto Dev tokens that would be returned to the user
    * in the swap
    */
     function getAmountOfTokens(
        uint256 inputAmount,
        uint256 inputReserve,
        uint256 outputReserve
    ) public pure returns (uint256) {
        require(inputReserve > 0 && outputReserve > 0, "invalid reserves");
        // We are charging a fees of `1%`
        // Input amount with fees = (input amount - (1*(input amount)/100)) = ((input amount)*99)/100
        uint256 inputAmountWithFee = inputAmount * 99;
        // Because we need to follow the concept of `XY = K` curve
        // We need to make sure (x + Δx)*(y - Δy) = (x)*(y)
        // so the final formulae is Δy = (y*Δx)/(x + Δx);
        // Δy in our case is `tokens to be recieved`
        // Δx = ((input amount)*99)/100, x = inputReserve, y = outputReserve
        // So by putting the values in the formulae you can get the numerator and denominator
        uint256 numerator = inputAmountWithFee * outputReserve;
        uint256 denominator = (inputReserve * 100) + inputAmountWithFee;
        return numerator / denominator;
    }

    /**
    @dev Swaps Ether for CryptoDev Tokens
    */
    function ethToCryptoDevToken(uint _minTokens) public payable {
        uint256 tokenReserve = getReserve();
        // call the `getAmountOfTokens` to get the amount of crypto dev tokens
        // that would be returned to the user after the swap
        // Notice that the `inputReserve` we are sending is equal to
        //  `address(this).balance - msg.value` instead of just `address(this).balance`
        // because `address(this).balance` already contains the `msg.value` user has sent in the given call
        // so we need to subtract it to get the actual input reserve
        uint256 tokensBought = getAmountOfTokens(
            msg.value,
            address(this).balance - msg.value,
            tokenReserve
        );

        require(tokensBought >= _minTokens, "insufficient output amount");
        // Transfer the `Crypto Dev` tokens to the user
        ERC20(cryptoDevTokenAddress).transfer(msg.sender, tokensBought);
    }


    /**
    @dev Swaps CryptoDev Tokens for Ether
    */
    function cryptoDevTokenToEth(uint _tokensSold, uint _minEth) public {
       uint256 tokenReserve = getReserve();
        // call the `getAmountOfTokens` to get the amount of ether
        // that would be returned to the user after the swap
        uint256 ethBought = getAmountOfTokens(
            _tokensSold,
            tokenReserve,
            address(this).balance
        );
        require(ethBought >= _minEth, "insufficient output amount");
        // Transfer `Crypto Dev` tokens from the user's address to the contract
        ERC20(cryptoDevTokenAddress).transferFrom(
            msg.sender,
            address(this),
            _tokensSold
        );
        // send the `ethBought` to the user from the contract
        payable(msg.sender).transfer(ethBought);
    }
  ```

}

````

- Compile the contract, open up a terminal pointing at `hardhat-tutorial` directory and execute this command

  ```bash
  npx hardhat compile
````

- Now we would install `dotenv` package to be able to import the env file and use it in our config. Open up a terminal pointing at`hardhat-tutorial` directory and execute this command

  ```bash
  npm install dotenv
  ```

- Now create a `.env` file in the `hardhat-tutorial` folder and add the following lines, use the instructions in the comments to get your Alchemy API Key URL and RINKEBY Private Key. Make sure that the account from which you get your rinkeby private key is funded with Rinkeby Ether.

```

// Go to https://www.alchemyapi.io, sign up, create
// a new App in its dashboard and select the network as Rinkeby, and replace "add-the-alchemy-key-url-here" with its key url
ALCHEMY_API_KEY_URL="add-the-alchemy-key-url-here"

// Replace this private key with your RINKEBY account private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Be aware of NEVER putting real Ether into testing accounts
RINKEBY_PRIVATE_KEY="add-the-rinkeby-private-key-here"
```

- Lets also create a constants folder to keep track of any constants we have. Under the `hardhat-tutorial` folder create a new folder named `constants` and under the `constants` folder create a new file `index.js`

- Inside the `index.js` file add the following lines of code. Remember to replace `ADDRESS-OF-CRYPTO-DEV-TOKEN` with the contract address of the `Crypto Dev` token contract that you deployed in the `ICO` tutorial

  ```js
  const CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS = "ADDRESS-OF-CRYPTO-DEV-TOKEN";

  module.exports = { CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS };
  ```

- Lets deploy the contract to `rinkeby` network.Create a new file named `deploy.js` under the `scripts` folder

- Now we would write some code to deploy the contract in `deploy.js` file.

  ```js
  const { ethers } = require("hardhat");
    require("dotenv").config({ path: ".env" });
    const { CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS } = require("../constants");

    async function main() {
    const cryptoDevTokenAddress = CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS;
    /*
    A ContractFactory in ethers.js is an abstraction used to deploy new smart contracts,
    so exchangeContract here is a factory for instances of our Exchange contract.
    */
    const exchangeContract = await ethers.getContractFactory("Exchange");

    // here we deploy the contract
    const deployedExhangeContract = await exchangeContract.deploy(
        cryptoDevTokenAddress
    );

    // print the address of the deployed contract
    console.log("Exchange Contract Address:", deployedExhangeContract.address);
    }

    // Call the main function and catch if there is any error
    main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

    }

    // Call the main function and catch if there is any error
    main()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error(error);
        process.exit(1);
        });
  ```

- Now open the hardhat.config.js file, we would add the `rinkeby` network here so that we can deploy our contract to rinkeby. Replace all the lines in the `hardhart.config.js` file with the given below lines

```js
require("@nomiclabs/hardhat-waffle");
require("dotenv").config({ path: ".env" });

const ALCHEMY_API_KEY_URL = process.env.ALCHEMY_API_KEY_URL;

const RINKEBY_PRIVATE_KEY = process.env.RINKEBY_PRIVATE_KEY;

module.exports = {
  solidity: "0.8.4",
  networks: {
    rinkeby: {
      url: ALCHEMY_API_KEY_URL,
      accounts: [RINKEBY_PRIVATE_KEY],
    },
  },
};
```

- To deploy, open up a terminal pointing at`hardhat-tutorial` directory and execute this command
  ```bash
      npx hardhat run scripts/deploy.js --network rinkeby
  ```
- Save the Exchange Contract Address that was printed on your terminal in your notepad, you would need it futher down in the tutorial.

### Website

- To develop the website we would be using [React](https://reactjs.org/) and [Next Js](https://nextjs.org/). React is a javascript framework which is used to make websites and Next Js is built on top of React.
- First, You would need to create a new `next` app. Your folder structure should look something like

  ```
     - Crypto-Devs-Dapp
         - hardhat-tutorial
         - next-app
  ```

- To create this `next-app`, in the terminal point to Whitelist-Dapp folder and type

  ```bash
      npx create-next-app@latest
  ```

  and press `enter` for all the questions

- Now to run the app, execute these commands in the terminal

  ```
  cd my-app
  npm run dev
  ```

- Now go to `http://localhost:3000`, your app should be running 🤘

- Now lets install Web3Modal library(https://github.com/Web3Modal/web3modal). Web3Modal is an easy-to-use library to help developers add support for multiple providers in their apps with a simple customizable configuration. By default Web3Modal Library supports injected providers like (Metamask, Dapper, Gnosis Safe, Frame, Web3 Browsers, etc), You can also easily configure the library to support Portis, Fortmatic, Squarelink, Torus, Authereum, D'CENT Wallet and Arkane.
  Open up a terminal pointing at`my-app` directory and execute this command

```bash
  npm install web3modal
```

- In the same terminal also install `ethers.js`

```bash
npm i ethers
```

- In your public folder, download this folder and all the images in it (https://github.com/LearnWeb3DAO/NFT-Collection/tree/main/my-app/public/cryptodevs). Make sure that the name of the downloaded folder is cryptodevs

- Now go to styles folder and replace all the contents of `Home.modules.css` file with the following code, this would add some styling to your dapp:

  ```css
  .main {
    min-height: 90vh;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    font-family: "Courier New", Courier, monospace;
  }

  .footer {
    display: flex;
    padding: 2rem 0;
    border-top: 1px solid #eaeaea;
    justify-content: center;
    align-items: center;
  }

  .image {
    width: 70%;
    height: 50%;
    margin-left: 20%;
  }

  .title {
    font-size: 2rem;
    margin: 2rem 0;
  }

  .description {
    line-height: 1;
    margin: 2rem 0;
    font-size: 1.2rem;
  }

  .button {
    border-radius: 4px;
    background-color: blue;
    border: none;
    color: #ffffff;
    font-size: 15px;
    padding: 20px;
    width: 200px;
    cursor: pointer;
    margin-bottom: 2%;
  }
  @media (max-width: 1000px) {
    .main {
      width: 100%;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
  }
  ```

- Open you index.js file under the pages folder and paste the following code, explanation of the code can be found in the comments.

  ```js
  import { Contract, providers, utils } from "ethers";
  import Head from "next/head";
  import React, { useEffect, useRef, useState } from "react";
  import Web3Modal from "web3modal";
  import { abi, NFT_CONTRACT_ADDRESS } from "../constants";
  import styles from "../styles/Home.module.css";

  export default function Home() {
    // walletConnected keep track of whether the user's wallet is connected or not
    const [walletConnected, setWalletConnected] = useState(false);
    // presaleStarted keeps track of whether the presale has started or not
    const [presaleStarted, setPresaleStarted] = useState(false);
    // presaleEnded keeps track of whether the presale ended
    const [presaleEnded, setPresaleEnded] = useState(false);
    // loading is set to true when we are waiting for a transaction to get mined
    const [loading, setLoading] = useState(false);
    // checks if the currently connected MetaMask wallet is the owner of the contract
    const [isOwner, setIsOwner] = useState(false);
    // tokenIdsMinted keeps track of the number of tokenIds that have been minted
    const [tokenIdsMinted, setTokenIdsMinted] = useState("0");
    // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
    const web3ModalRef = useRef();

    /**
     * presaleMint: Mint an NFT during the presale
     */
    const presaleMint = async () => {
      try {
        // We need a Signer here since this is a 'write' transaction.
        const signer = await getProviderOrSigner(true);
        // Create a new instance of the Contract with a Signer, which allows
        // update methods
        const whitelistContract = new Contract(
          NFT_CONTRACT_ADDRESS,
          abi,
          signer
        );
        // call the presaleMint from the contract, only whitelisted addresses would be able to mint
        const tx = await whitelistContract.presaleMint({
          // value signifies the cost of one crypto dev which is "0.01" eth.
          // We are parsing `0.01` string to ether using the utils library from ethers.js
          value: utils.parseEther("0.01"),
        });
        setLoading(true);
        // wait for the transaction to get mined
        await tx.wait();
        setLoading(false);
        window.alert("You successfully minted a Crypto Dev!");
      } catch (err) {
        console.error(err);
      }
    };

    /**
     * publicMint: Mint an NFT after the presale
     */
    const publicMint = async () => {
      try {
        // We need a Signer here since this is a 'write' transaction.
        const signer = await getProviderOrSigner(true);
        // Create a new instance of the Contract with a Signer, which allows
        // update methods
        const whitelistContract = new Contract(
          NFT_CONTRACT_ADDRESS,
          abi,
          signer
        );
        // call the mint from the contract to mint the Crypto Dev
        const tx = await whitelistContract.mint({
          // value signifies the cost of one crypto dev which is "0.01" eth.
          // We are parsing `0.01` string to ether using the utils library from ethers.js
          value: utils.parseEther("0.01"),
        });
        setLoading(true);
        // wait for the transaction to get mined
        await tx.wait();
        setLoading(false);
        window.alert("You successfully minted a Crypto Dev!");
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
     * startPresale: starts the presale for the NFT Collection
     */
    const startPresale = async () => {
      try {
        // We need a Signer here since this is a 'write' transaction.
        const signer = await getProviderOrSigner(true);
        // Create a new instance of the Contract with a Signer, which allows
        // update methods
        const whitelistContract = new Contract(
          NFT_CONTRACT_ADDRESS,
          abi,
          signer
        );
        // call the startPresale from the contract
        const tx = await whitelistContract.startPresale();
        setLoading(true);
        // wait for the transaction to get mined
        await tx.wait();
        setLoading(false);
        // set the presale started to true
        await checkIfPresaleStarted();
      } catch (err) {
        console.error(err);
      }
    };

    /**
     * checkIfPresaleStarted: checks if the presale has started by quering the `presaleStarted`
     * variable in the contract
     */
    const checkIfPresaleStarted = async () => {
      try {
        // Get the provider from web3Modal, which in our case is MetaMask
        // No need for the Signer here, as we are only reading state from the blockchain
        const provider = await getProviderOrSigner();
        // We connect to the Contract using a Provider, so we will only
        // have read-only access to the Contract
        const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
        // call the presaleStarted from the contract
        const _presaleStarted = await nftContract.presaleStarted();
        if (!_presaleStarted) {
          await getOwner();
        }
        setPresaleStarted(_presaleStarted);
        return _presaleStarted;
      } catch (err) {
        console.error(err);
        return false;
      }
    };

    /**
     * checkIfPresaleEnded: checks if the presale has ended by quering the `presaleEnded`
     * variable in the contract
     */
    const checkIfPresaleEnded = async () => {
      try {
        // Get the provider from web3Modal, which in our case is MetaMask
        // No need for the Signer here, as we are only reading state from the blockchain
        const provider = await getProviderOrSigner();
        // We connect to the Contract using a Provider, so we will only
        // have read-only access to the Contract
        const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
        // call the presaleEnded from the contract
        const _presaleEnded = await nftContract.presaleEnded();
        // _presaleEnded is a Big Number, so we are using the lt(less than function) insteal of `<`
        // Date.now()/1000 returns the current time in seconds
        // We compare if the _presaleEnded timestamp is less than the current time
        // which means presale has ended
        const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000));
        if (hasEnded) {
          setPresaleEnded(true);
        } else {
          setPresaleEnded(false);
        }
        return hasEnded;
      } catch (err) {
        console.error(err);
        return false;
      }
    };

    /**
     * getOwner: calls the contract to retrieve the owner
     */
    const getOwner = async () => {
      try {
        // Get the provider from web3Modal, which in our case is MetaMask
        // No need for the Signer here, as we are only reading state from the blockchain
        const provider = await getProviderOrSigner();
        // We connect to the Contract using a Provider, so we will only
        // have read-only access to the Contract
        const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
        // call the owner function from the contract
        const _owner = await nftContract.owner();
        // We will get the signer now to extract the address of the currently connected MetaMask account
        const signer = await getProviderOrSigner(true);
        // Get the address associated to the signer which is connected to  MetaMask
        const address = await signer.getAddress();
        if (address.toLowerCase() === _owner.toLowerCase()) {
          setIsOwner(true);
        }
      } catch (err) {
        console.error(err.message);
      }
    };

    /**
     * getTokenIdsMinted: gets the number of tokenIds that have been minted
     */
    const getTokenIdsMinted = async () => {
      try {
        // Get the provider from web3Modal, which in our case is MetaMask
        // No need for the Signer here, as we are only reading state from the blockchain
        const provider = await getProviderOrSigner();
        // We connect to the Contract using a Provider, so we will only
        // have read-only access to the Contract
        const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
        // call the tokenIds from the contract
        const _tokenIds = await nftContract.tokenIds();
        //_tokenIds is a `Big Number`. We need to convert the Big Number to a string
        setTokenIdsMinted(_tokenIds.toString());
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

        // Check if presale has started and ended
        const _presaleStarted = checkIfPresaleStarted();
        if (_presaleStarted) {
          checkIfPresaleEnded();
        }

        getTokenIdsMinted();

        // Set an interval which gets called every 5 seconds to check presale has ended
        const presaleEndedInterval = setInterval(async function () {
          const _presaleStarted = await checkIfPresaleStarted();
          if (_presaleStarted) {
            const _presaleEnded = await checkIfPresaleEnded();
            if (_presaleEnded) {
              clearInterval(presaleEndedInterval);
            }
          }
        }, 5 * 1000);

        // set an interval to get the number of token Ids minted every 5 seconds
        setInterval(async function () {
          await getTokenIdsMinted();
        }, 5 * 1000);
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

      // If connected user is the owner, and presale hasnt started yet, allow them to start the presale
      if (isOwner && !presaleStarted) {
        return (
          <button className={styles.button} onClick={startPresale}>
            Start Presale!
          </button>
        );
      }

      // If connected user is not the owner but presale hasn't started yet, tell them that
      if (!presaleStarted) {
        return (
          <div>
            <div className={styles.description}>Presale hasnt started!</div>
          </div>
        );
      }

      // If presale started, but hasn't ended yet, allow for minting during the presale period
      if (presaleStarted && !presaleEnded) {
        return (
          <div>
            <div className={styles.description}>
              Presale has started!!! If your address is whitelisted, Mint a
              Crypto Dev 🥳
            </div>
            <button className={styles.button} onClick={presaleMint}>
              Presale Mint 🚀
            </button>
          </div>
        );
      }

      // If presale started and has ended, its time for public minting
      if (presaleStarted && presaleEnded) {
        return (
          <button className={styles.button} onClick={publicMint}>
            Public Mint 🚀
          </button>
        );
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
            <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
            <div className={styles.description}>
              Its an NFT collection for developers in Crypto.
            </div>
            <div className={styles.description}>
              {tokenIdsMinted}/20 have been minted
            </div>
            {renderButton()}
          </div>
          <div>
            <img className={styles.image} src="./cryptodevs/0.svg" />
          </div>
        </div>

        <footer className={styles.footer}>
          Made with &#10084; by Crypto Devs
        </footer>
      </div>
    );
  }
  ```

- Now create a new folder under the my-app folder and name it `constants`.
- In the constants folder create a file, `index.js` and paste the following code. Replace `"addres of your NFT contract"` with the address of the CryptoDevs contract that you deployed and saved to your notepad. Replace `---your abi---` with the abi of your CryptoDevs Contract. To get the abi for your contract, go to your `hardhat-tutorial/artifacts/contracts/CryptoDevs.sol` folder and from your `CryptoDevs.json` file get the array marked under the `"abi"` key.

  ```js
  export const abi =---your abi---
  export const NFT_CONTRACT_ADDRESS = = "addres of your NFT contract"
  ```

- Now in your terminal which is pointing to `my-app` folder, execute

  ```bash
  npm run dev
  ```

Your whitelist dapp should now work without errors 🚀

---

## Deploying your dApp

We will now deploy your dApp, so that everyone can see your website and you can share it with all of your LearnWeb3 DAO friends.

- Go to https://vercel.com/ and sign in with your GitHub
- Then click on `New Project` button and then select your Whitelist dApp repo
- ![](https://i.imgur.com/ZRjfkCE.png)
- When configuring your new project, Vercel will allow you to customize your `Root Directory`
- Click `Edit` next to `Root Directory` and set it to `my-app`
- Click `Deploy`
- Now you can see your deployed website by going to your dashboard, selecting your project, and copying the URL from there!

Share your website in Discord :D

## View your Collection on Opensea

Now lets make your collection available on Opensea
