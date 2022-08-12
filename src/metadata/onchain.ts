import { Interface } from "@ethersproject/abi";
import { Contract } from "@ethersproject/contracts";
import { JsonRpcProvider } from "@ethersproject/providers";
import { parseBytes32String } from "@ethersproject/strings";
import { TokenInfo } from "@uniswap/token-lists";

import { MinimalTokenInfo, Network } from "../types";

const providers = {
  aurora: new JsonRpcProvider("https://rpc.polarisfinance.io"),
};

export const chainIdMap = {
  aurora: 1313161554,
};

const multicallContract = {
  aurora: "0x04364F8908BDCB4cc7EA881d0DE869398BA849C9",
};

const erc20ABI = [
  "function name() returns (string)",
  "function symbol() returns (string)",
  "function decimals() returns (uint256)",
];

const multicallABI = [
  "function tryAggregate(bool, tuple(address, bytes)[]) view returns (tuple(bool, bytes)[])",
];

const decodeERC20Metadata = (
  nameResponse: string,
  symbolResponse: string,
  decimalsResponse: string
): MinimalTokenInfo => {
  const erc20 = new Interface(erc20ABI);

  let name: string;
  try {
    [name] = erc20.decodeFunctionResult("name", nameResponse);
  } catch {
    try {
      name = parseBytes32String(nameResponse);
    } catch {
      name = "UNKNOWN";
    }
  }

  let symbol: string;
  try {
    [symbol] = erc20.decodeFunctionResult("symbol", symbolResponse);
  } catch {
    try {
      symbol = parseBytes32String(symbolResponse);
    } catch {
      symbol = "UNKNOWN";
    }
  }

  let decimals: number;
  try {
    const [decimalsBN] = erc20.decodeFunctionResult(
      "decimals",
      decimalsResponse
    );
    decimals = decimalsBN.toNumber();
  } catch {
    decimals = 18;
  }

  return {
    name,
    symbol,
    decimals,
  };
};

export async function getNetworkMetadata(
  network: Network,
  tokens: string[]
): Promise<Record<string, TokenInfo>> {
  const provider = providers[network];
  const multicallAddress = multicallContract[network];

  const multi = new Contract(multicallAddress, multicallABI, provider);
  const erc20 = new Interface(erc20ABI);
  const calls: [string, string][] = [];
  tokens.forEach((token) => {
    calls.push([token, erc20.encodeFunctionData("name", [])]);
    calls.push([token, erc20.encodeFunctionData("symbol", [])]);
    calls.push([token, erc20.encodeFunctionData("decimals", [])]);
  });
  const response = await multi.tryAggregate(false, calls);

  const tokenMetadata = tokens.reduce((acc, address, index) => {
    acc[address] = {
      address,
      chainId: chainIdMap[network],
      ...decodeERC20Metadata(
        response[3 * index][1],
        response[3 * index + 1][1],
        response[3 * index + 2][1]
      ),
    };

    return acc;
  }, {} as Record<string, TokenInfo>);

  return tokenMetadata;
}
