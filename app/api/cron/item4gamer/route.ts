export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.SUPPLIER_WORKER_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  return Response.json({ success: true, delegatedTo: "static-ip-vps", checkedAt: new Date().toISOString() });
}
