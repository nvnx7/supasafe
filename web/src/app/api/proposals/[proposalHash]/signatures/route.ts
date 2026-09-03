import { saveProposalSignature } from "@/db/proposals";
import {
  getChainId,
  getRouteError,
  isProposalSignature,
  isRecord,
} from "@/server/proposals-api";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalHash: string }> },
) {
  try {
    const payload: unknown = await request.json();
    if (!isRecord(payload) || !isProposalSignature(payload.signature)) {
      return Response.json(
        { error: "Invalid signature payload." },
        { status: 400 },
      );
    }

    const { proposalHash } = await params;
    const proposal = await saveProposalSignature({
      chainId: getChainId(
        typeof payload.chainId === "string" ? payload.chainId : null,
      ),
      proposalHash,
      signature: payload.signature,
    });
    return Response.json({ proposal });
  } catch (error) {
    const { error: message, status } = getRouteError(error);
    return Response.json({ error: message }, { status });
  }
}
