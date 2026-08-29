import type {
  Call,
  DeclareSignerDetails,
  DeployAccountSignerDetails,
  InvocationsSignerDetails,
  Signature,
  SignerInterface,
  TypedData,
} from "starknet";
import { num, stark } from "starknet";
import {
  computeCallSetHash,
  type MultisigCall,
  type OwnerSignature,
  packSignatureBundle,
} from "@/lib/signing";

export type ProposalSigningPayload = {
  hash: string;
  calls: MultisigCall[];
  signature: string[];
};

type ProposalSignerOptions = {
  multisigAddress: string;
  chainId: string;
  ownerIndex: number;
  signApproval: (callSetHash: bigint) => Promise<Signature>;
};

function serializeCalls(calls: Call[]): MultisigCall[] {
  return calls.map((call) => {
    if (!Array.isArray(call.calldata)) {
      throw new Error("SDK produced a call with non-array calldata.");
    }

    return {
      contractAddress: num.toHex(call.contractAddress),
      entrypoint: call.entrypoint,
      calldata: (call.calldata as string[]).map((value) => num.toHex(value)),
    };
  });
}

/// Bridges the SDK's proof-invocation signer to Supasafe owner approvals. The signature returned
/// here is the multisig's packed threshold bundle, not a connected wallet account signature.
export function createMultisigProposalSigner({
  multisigAddress,
  chainId,
  ownerIndex,
  signApproval,
}: ProposalSignerOptions) {
  let payload: ProposalSigningPayload | null = null;

  const signer: SignerInterface = {
    async signTransaction(calls: Call[], _details: InvocationsSignerDetails) {
      const serializedCalls = serializeCalls(calls);
      const hash = computeCallSetHash(
        multisigAddress,
        serializedCalls,
        chainId,
      );
      const ownerSignature: OwnerSignature = {
        ownerIndex,
        signature: await signApproval(hash),
      };
      const signature = packSignatureBundle([ownerSignature]);

      payload = {
        hash: num.toHex(hash),
        calls: serializedCalls,
        signature: stark
          .formatSignature(ownerSignature.signature)
          .map(num.toHex),
      };
      return signature;
    },
    async getPubKey() {
      throw new Error("Multisig proposal signer does not expose a public key.");
    },
    async signMessage(_typedData: TypedData, _accountAddress: string) {
      throw new Error("Multisig proposal signer only signs SDK call sets.");
    },
    async signDeclareTransaction(_details: DeclareSignerDetails) {
      throw new Error("Multisig proposal signer cannot declare contracts.");
    },
    async signDeployAccountTransaction(_details: DeployAccountSignerDetails) {
      throw new Error("Multisig proposal signer cannot deploy accounts.");
    },
  };

  return {
    signer,
    getPayload() {
      if (!payload)
        throw new Error("SDK did not request a proposal signature.");
      return payload;
    },
  };
}
