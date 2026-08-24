import { PrivacyPoolABI } from "@starkware-libs/starknet-privacy-sdk/abi";
import { Contract, type ProviderOrAccount } from "starknet";
import { networkConfig } from "@/config/network";

// Pass a provider to read, an account to write.
export function poolContract(providerOrAccount: ProviderOrAccount) {
  if (!networkConfig.privacyPoolAddress) {
    throw new Error("No privacy pool is configured for this network.");
  }

  return new Contract({
    abi: PrivacyPoolABI,
    address: networkConfig.privacyPoolAddress,
    providerOrAccount,
  }).typedv2(PrivacyPoolABI);
}
