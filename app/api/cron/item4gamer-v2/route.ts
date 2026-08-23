import {
  dispatchItem4GamerJobs,
  syncItem4GamerStatuses,
} from "@/lib/providers/item4gamer/worker";
import { reconcileItem4GamerRejectedOrders } from "@/lib/providers/item4gamer/refund-reconciler";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.SUPPLIER_WORKER_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const dispatched = await dispatchItem4GamerJobs(25);
    const synced = await syncItem4GamerStatuses(100);
    const refunds = await reconcileItem4GamerRejectedOrders(100);
    return Response.json({
      success: true,
      dispatched,
      synced,
      refunds,
      durationMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Item4Gamer v2 worker failed", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Item4Gamer worker failed",
        durationMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
}
