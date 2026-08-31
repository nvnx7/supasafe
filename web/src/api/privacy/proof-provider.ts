import {
  type Proof,
  type ProofInvocation,
  type ProofInvocationFactoryDetails,
  type ProofProviderInterface,
  type ProvingBlockId,
  ProvingServiceProofProvider,
} from "@starkware-libs/starknet-privacy-sdk";
import axios, { isAxiosError } from "axios";
import type { constants } from "starknet";
import type { NetworkConfig } from "@/config/network";

const STARKSCAN_PROVE_URL = "https://api.starkscan.co/v1/SN_MAIN/prove";
const FALLBACK_POLL_DELAY_SECONDS = 5;

type StarkscanL2ToL1Message = {
  from_address: string;
  payload: string[];
};

type StarkscanProofResult = {
  proof: string;
  proof_facts?: string[];
  l2_to_l1_messages?: StarkscanL2ToL1Message[];
  additional_data?: Proof["additionalData"];
};

type StarkscanProofJob = {
  jobId: string;
  status:
    | "queued"
    | "dispatched"
    | "succeeded"
    | "failed"
    | "unavailable"
    | "unknown_delivery";
  terminal: boolean;
  pollAfterSeconds?: number;
  result?: StarkscanProofResult;
  error?: {
    code?: string | number;
    message?: string;
  };
};

type StarkscanProofRequest = {
  block_id: Record<string, number | string>;
  transaction: unknown;
};

/** Adapts Starkscan's async mainnet prover to the STRK20 SDK interface. */
class StarkscanProofProvider implements ProofProviderInterface {
  private readonly defaultDetailsProvider: ProvingServiceProofProvider;

  constructor(
    private readonly apiKey: string,
    chainId: constants.StarknetChainId,
  ) {
    this.defaultDetailsProvider = new ProvingServiceProofProvider(
      STARKSCAN_PROVE_URL,
      chainId,
    );
  }

  getDefaultDetails(): Promise<ProofInvocationFactoryDetails> {
    return this.defaultDetailsProvider.getDefaultDetails();
  }

  invalidateNonceCache(): void {
    this.defaultDetailsProvider.invalidateNonceCache?.();
  }

  async prove(
    invocation: ProofInvocation,
    blockIdentifier?: ProvingBlockId,
  ): Promise<Proof> {
    if (!this.apiKey) {
      throw new Error(
        "Missing NEXT_PUBLIC_API_KEY_STARKSCAN for mainnet proof generation.",
      );
    }

    const request: StarkscanProofRequest = {
      block_id: toStarkscanBlockId(blockIdentifier),
      transaction: serializeBigInts(invocation),
    };
    const idempotencyKey = crypto.randomUUID();
    let job = await this.submit(request, idempotencyKey);

    if (job.status === "unavailable") {
      job = await this.submit(request, idempotencyKey);
    }

    while (!job.terminal) {
      await sleep(
        (job.pollAfterSeconds ?? FALLBACK_POLL_DELAY_SECONDS) * 1_000,
      );
      job = await this.getJob(job.jobId);
    }

    if (job.status === "succeeded" && job.result) {
      return toSdkProof(job.result, invocation);
    }

    if (job.status === "unknown_delivery") {
      throw new Error(
        `Starkscan prover could not confirm job ${job.jobId}. Do not resubmit automatically.`,
      );
    }

    const details = job.error?.message ?? "No failure details were returned.";
    throw new Error(`Starkscan prover job ${job.jobId} failed: ${details}`);
  }

  private async submit(
    request: StarkscanProofRequest,
    idempotencyKey: string,
  ): Promise<StarkscanProofJob> {
    try {
      const response = await axios.post<StarkscanProofJob>(
        STARKSCAN_PROVE_URL,
        request,
        { headers: this.headers(idempotencyKey) },
      );
      return response.data;
    } catch (error) {
      throw toStarkscanError(error);
    }
  }

  private async getJob(jobId: string): Promise<StarkscanProofJob> {
    try {
      const response = await axios.get<StarkscanProofJob>(
        `${STARKSCAN_PROVE_URL}/${jobId}`,
        { headers: this.headers() },
      );
      return response.data;
    } catch (error) {
      throw toStarkscanError(error);
    }
  }

  private headers(idempotencyKey?: string) {
    return {
      "X-Starkscan-Api-Key": this.apiKey,
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    };
  }
}

export function createProofProvider(
  config: NetworkConfig,
): ProofProviderInterface {
  if (config.proving.kind === "starkscan") {
    return new StarkscanProofProvider(
      config.proving.apiKey,
      config.chainId as constants.StarknetChainId,
    );
  }

  return new ProvingServiceProofProvider(
    config.proving.url,
    config.chainId as constants.StarknetChainId,
  );
}

function toStarkscanBlockId(
  blockIdentifier: ProvingBlockId | undefined,
): Record<string, number | string> {
  if (typeof blockIdentifier === "number") {
    return { block_number: blockIdentifier };
  }

  throw new Error(
    "Starkscan proof generation requires an explicit finalized proving block.",
  );
}

function toSdkProof(
  result: StarkscanProofResult,
  invocation: ProofInvocation,
): Proof {
  const poolMessage = result.l2_to_l1_messages?.find((message) =>
    addressesEqual(message.from_address, invocation.sender_address),
  );

  if (!poolMessage) {
    throw new Error(
      "Starkscan proof result did not include output from the privacy pool.",
    );
  }

  return {
    data: result.proof,
    output: poolMessage.payload,
    proofFacts: result.proof_facts ?? [],
    ...(result.additional_data
      ? { additionalData: result.additional_data }
      : {}),
  };
}

function addressesEqual(left: string, right: string) {
  try {
    return BigInt(left) === BigInt(right);
  } catch {
    return left.toLowerCase() === right.toLowerCase();
  }
}

function serializeBigInts(value: unknown): unknown {
  if (typeof value === "bigint") {
    return `0x${value.toString(16)}`;
  }

  if (Array.isArray(value)) {
    return value.map(serializeBigInts);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        serializeBigInts(child),
      ]),
    );
  }

  return value;
}

function toStarkscanError(error: unknown): Error {
  if (isAxiosError<{ error?: { message?: string } }>(error)) {
    const message = error.response?.data?.error?.message ?? error.message;
    return new Error(`Starkscan prover request failed: ${message}`);
  }

  return error instanceof Error
    ? error
    : new Error("Starkscan prover request failed.");
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
