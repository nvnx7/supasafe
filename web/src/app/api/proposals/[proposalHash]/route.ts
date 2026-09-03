import { getProposal } from "@/db/proposals";
import { getChainId, getRouteError } from "@/server/proposals-api";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ proposalHash: string }> },
) {
  try {
    const { proposalHash } = await params;
    const { searchParams } = new URL(request.url);
    const proposal = await getProposal({
      chainId: getChainId(searchParams.get("chainId")),
      proposalHash,
    });
    if (!proposal) {
      return Response.json(
        { error: "Proposal was not found." },
        { status: 404 },
      );
    }

    return Response.json({ proposal });
  } catch (error) {
    const { error: message, status } = getRouteError(error);
    return Response.json({ error: message }, { status });
  }
}
