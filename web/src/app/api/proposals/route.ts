import { listProposals, saveProposal } from "@/db/proposals";
import {
  getChainId,
  getRouteError,
  isProposal,
  isRecord,
} from "@/server/proposals-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const proposals = await listProposals({
      chainId: getChainId(searchParams.get("chainId")),
      multisigAddress: requireParameter(searchParams.get("multisigAddress")),
      owner: requireParameter(searchParams.get("owner")),
    });
    return Response.json({ proposals });
  } catch (error) {
    return respondWithError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    if (!isRecord(payload) || !isProposal(payload.proposal)) {
      return Response.json(
        { error: "Invalid proposal payload." },
        { status: 400 },
      );
    }

    const proposal = await saveProposal({
      chainId: getChainId(readString(payload.chainId)),
      proposal: payload.proposal,
    });
    return Response.json({ proposal }, { status: 201 });
  } catch (error) {
    return respondWithError(error);
  }
}

function requireParameter(value: string | null) {
  if (!value) throw new Error("A required proposal parameter is missing.");
  return value;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function respondWithError(error: unknown) {
  const { error: message, status } = getRouteError(error);
  return Response.json({ error: message }, { status });
}
