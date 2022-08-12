import { TokenInfo } from "@uniswap/token-lists";

export enum Network {
  Aurora = "aurora",
}

export enum List {
  Listed = "listed",
  Vetted = "vetted",
  Untrusted = "untrusted",
}

export type MinimalTokenInfo = Pick<TokenInfo, "name" | "symbol" | "decimals">;
export type MetadataOverride = Partial<TokenInfo>;
