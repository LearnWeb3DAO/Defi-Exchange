// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Exchange is ERC20 {
    address public cryptoDevTokenAddress;

    constructor(address _CryptoDevtoken) ERC20("CryptoDev LP Token", "CDLP") {
        require(_CryptoDevtoken != address(0), "Token address passed is a null address");
        cryptoDevTokenAddress = _CryptoDevtoken;
    }

    function addLiquidity(uint _amount) public payable returns (uint) {
        uint liquidity;
        uint ethSent = address(this).balance;
        if(getReserve() == 0) {
            IERC20 CryptoDevtoken = IERC20(cryptoDevTokenAddress);
            CryptoDevtoken.transferFrom(msg.sender, address(this), _amount);
            liquidity = ethSent;
            _mint(msg.sender, liquidity);
        } else {
            uint ethReserve =  ethSent - msg.value;
            uint cryptoDevTokenReserve = getReserve();
            uint cryptoDevTokenAmount = (msg.value * cryptoDevTokenReserve)/(ethReserve);
            IERC20 cryptoDevToken = IERC20(cryptoDevTokenAddress);
            require(_amount >= cryptoDevTokenAmount, "Amount of tokens sent is less than the minimum tokens required");
            cryptoDevToken.transferFrom(msg.sender, address(this), cryptoDevTokenAmount);
            liquidity = (totalSupply() * msg.value)/ ethReserve;
            _mint(msg.sender, liquidity);
        }
         return liquidity;
    }

    function getReserve() public view returns (uint) {
        return IERC20(cryptoDevTokenAddress).balanceOf(address(this));
    }

    function getAmountOfTokens(uint inputAmount, bool isEther) private view returns(uint) {
        uint _cryptoDevTokenReserve = getReserve();
        uint etherReserve = address(this).balance;

        require(inputAmount > 0, "Input amount is really low");
        require((_cryptoDevTokenReserve > 0) && (etherReserve > 0), "Exchange doesnt have enough reserve");

        uint inputAmountWithFee = inputAmount * 99;

        if(isEther) {
            return (inputAmountWithFee * _cryptoDevTokenReserve)/((etherReserve*100) + inputAmountWithFee);
        } else {
            return (inputAmountWithFee * etherReserve)/((_cryptoDevTokenReserve*100) + inputAmountWithFee);
        }
    }

    function ethToCryptoDevToken(uint _minTokens) public payable {
        uint tokensBought = getAmountOfTokens(msg.value, true);
        require(tokensBought >= _minTokens, "Tokens that can be bought are less than the min tokens specified");
        IERC20(cryptoDevTokenAddress).transfer(msg.sender, tokensBought);
    }

    function cryptoDevTokenToEth(uint _tokensSold, uint _minEth) public {
        uint ethBought = getAmountOfTokens(_tokensSold, false);
        require(ethBought >= _minEth, "Eth that can be bought is less than the min Eth specified");
        IERC20(cryptoDevTokenAddress).transferFrom(msg.sender, address(this), _tokensSold);
        payable(msg.sender).transfer(ethBought);
    }

    function removeLiquidity(uint _amount) public returns (uint , uint) {
        require(_amount > 0, "_amount should be greater than zero");
        uint ethAmount = (address(this).balance * _amount)/ totalSupply();
        uint cryptoDevTokenAmount = (getReserve() * _amount)/ totalSupply();
        _burn(msg.sender, _amount);
        payable(msg.sender).transfer(ethAmount);
        IERC20(cryptoDevTokenAddress).transfer(msg.sender, cryptoDevTokenAmount);
        return (ethAmount, cryptoDevTokenAmount);
    }
}