import { markProposalExecuted } from "@/db/proposals";
import { getChainId, getRouteError, isRecord } from "@/server/proposals-api";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalHash: string }> },
) {
  try {
    const payload: unknown = await request.json();
    if (!isRecord(payload) || typeof payload.chainId !== "string") {
      return Response.json(
        { error: "Invalid execution payload." },
        { status: 400 },
      );
    }

    const { proposalHash } = await params;
    const proposal = await markProposalExecuted({
      chainId: getChainId(payload.chainId),
      proposalHash,
    });
    return Response.json({ proposal });
  } catch (error) {
    const { error: message, status } = getRouteError(error);
    return Response.json({ error: message }, { status });
  }
}
