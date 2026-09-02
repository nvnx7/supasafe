import { type VesuVaultConfig, vesuConfig } from "@/config/dapp";

export function getVesuVaultByUnderlying(
  underlyingToken: string,
): VesuVaultConfig {
  ensureVesuConfigured();

  const vault = vesuConfig.vaults.find(
    (entry) => BigInt(entry.underlyingToken) === BigInt(underlyingToken),
  );
  if (!vault) {
    throw new Error("This token is not configured for Vesu lending.");
  }

  return vault;
}

export function getVesuVaultByVToken(vTokenAddress: string): VesuVaultConfig {
  ensureVesuConfigured();

  const vault = vesuConfig.vaults.find(
    (entry) => BigInt(entry.vTokenAddress) === BigInt(vTokenAddress),
  );
  if (!vault) {
    throw new Error("This Vesu position token is not configured.");
  }

  return vault;
}

export function getVesuAnonymizerAddress() {
  ensureVesuConfigured();
  return vesuConfig.anonymizerAddress;
}

function ensureVesuConfigured() {
  if (!vesuConfig.anonymizerAddress || vesuConfig.vaults.length === 0) {
    throw new Error("Vesu lending is not configured for this network.");
  }
}
