import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOpenSpotHoldings } from "@/services/portfolio-holdings.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accountId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const holdings = await getOpenSpotHoldings(session.accountId);

    const items = holdings.map((h) => ({
      symbol: h.symbol,
      name: null, // name not needed for the multiselect
    }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error("[GET /api/portfolio/symbols] error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
