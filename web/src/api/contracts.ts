import { PrivacyPoolABI } from "@starkware-libs/starknet-privacy-sdk/abi";
import { Contract, type ProviderOrAccount } from "starknet";
import { SupasafeRegistryFactoryABI } from "@/api/abi/supasafe-factory";
import { networkConfig } from "@/config/network";

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

export function supasafeFactoryContract(providerOrAccount: ProviderOrAccount) {
  if (!networkConfig.supasafeFactoryAddress) {
    throw new Error("No Supasafe factory is configured for this network.");
  }

  return new Contract({
    abi: SupasafeRegistryFactoryABI,
    address: networkConfig.supasafeFactoryAddress,
    providerOrAccount,
  }).typedv2(SupasafeRegistryFactoryABI);
}
