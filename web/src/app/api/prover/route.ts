import axios, { isAxiosError } from "axios";
import { NextResponse } from "next/server";
import { apiKeyStarkscanMainnet } from "@/config/env";

const STARKSCAN_PROVE_URL = "https://api.starkscan.co/v1/SN_MAIN/prove";

type ProveRequestBody = {
  request?: unknown;
  idempotencyKey?: unknown;
};

function getApiKey() {
  if (!apiKeyStarkscanMainnet) {
    throw new Error("Starkscan prover API key is not configured.");
  }
  return apiKeyStarkscanMainnet;
}

function isValidIdempotencyKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[\x21-\x7e]{16,128}$/.test(value) &&
    !value.includes('"')
  );
}

function responseFromError(error: unknown) {
  if (isAxiosError(error)) {
    return NextResponse.json(
      error.response?.data ?? { error: { message: error.message } },
      { status: error.response?.status ?? 502 },
    );
  }

  return NextResponse.json(
    {
      error: {
        message:
          error instanceof Error ? error.message : "Prover request failed.",
      },
    },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProveRequestBody;
    if (!body.request || !isValidIdempotencyKey(body.idempotencyKey)) {
      return NextResponse.json(
        { error: { message: "Invalid proof submission." } },
        { status: 400 },
      );
    }

    const response = await axios.post(STARKSCAN_PROVE_URL, body.request, {
      headers: {
        "X-Starkscan-Api-Key": getApiKey(),
        "Idempotency-Key": body.idempotencyKey,
      },
      validateStatus: () => true,
    });
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    return responseFromError(error);
  }
}

export async function GET(request: Request) {
  try {
    const jobId = new URL(request.url).searchParams.get("jobId");
    if (!jobId || !/^prv_[A-Za-z0-9]+$/.test(jobId)) {
      return NextResponse.json(
        { error: { message: "Invalid proof job ID." } },
        { status: 400 },
      );
    }

    const response = await axios.get(
      `${STARKSCAN_PROVE_URL}/${encodeURIComponent(jobId)}`,
      {
        headers: { "X-Starkscan-Api-Key": getApiKey() },
        validateStatus: () => true,
      },
    );
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    return responseFromError(error);
  }
}
