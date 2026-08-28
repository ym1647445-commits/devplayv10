# DevPlay Item4Gamer Worker on Ubuntu 24.04

This deployment runs the supplier worker directly from the VPS. It does not expose an HTTP server or a public proxy. Item4Gamer sees the VPS public egress IP, so assign a static public IP to the VPS and whitelist that exact IP when required.

## Safety before deployment

1. Review and apply docs/item4gamer_vps_worker.sql to the existing Supabase project. It adds one service-role-only atomic claim RPC and one partial index. It does not add or rename table columns.
2. Do not use DP-O-000024 for dispatch during installation. The supplied inspector is read-only.
3. Keep the existing scheduled worker enabled until the VPS service is healthy. After cutover, disable the schedules in .github/workflows/item4gamer-worker.yml and item4gamer-worker-v2.yml. Atomic claiming prevents the same not_sent job from being claimed twice during transition.

## Transfer and install

Install Node.js 22 LTS and Git on Ubuntu 24.04, then copy the reviewed repository to /opt/devplay-platform. Clone the approved commit or transfer it over SSH with rsync. Do not transfer .env.local.

~~~bash
sudo adduser --system --group --home /opt/devplay-platform devplay
sudo install -d -o devplay -g devplay /opt/devplay-platform
sudo -u devplay git clone --branch main --single-branch YOUR_PRIVATE_REPOSITORY_URL /opt/devplay-platform
cd /opt/devplay-platform
sudo -u devplay npm ci --omit=dev
~~~

For an SSH transfer instead of Git:

~~~bash
rsync -az --exclude .git --exclude .next --exclude node_modules --exclude .env.local ./ USER@STATIC_VPS_IP:/tmp/devplay-platform/
sudo rsync -a /tmp/devplay-platform/ /opt/devplay-platform/
sudo chown -R devplay:devplay /opt/devplay-platform
cd /opt/devplay-platform
sudo -u devplay npm ci --omit=dev
~~~

Create the secret environment file directly on the VPS. Never commit it and never paste values into the service file:

~~~bash
sudo install -d -m 750 -o root -g devplay /etc/devplay
sudo install -m 640 -o root -g devplay /dev/null /etc/devplay/item4gamer-worker.env
sudoedit /etc/devplay/item4gamer-worker.env
~~~

Use deploy/ubuntu/item4gamer-worker.env.example only as a key-name template.

Install and start systemd:

~~~bash
sudo install -m 644 deploy/ubuntu/item4gamer-worker.service /etc/systemd/system/item4gamer-worker.service
sudo systemctl daemon-reload
sudo systemctl enable --now item4gamer-worker.service
sudo systemctl status item4gamer-worker.service
sudo journalctl -u item4gamer-worker.service -f
~~~

The service has no listening port. Only outbound HTTPS to Supabase and Item4Gamer is required.

## Read-only test for DP-O-000024

Run this only after loading the environment file. It reads the order and jobs; it cannot claim or send anything:

~~~bash
sudo -u devplay bash -lc 'set -a; source /etc/devplay/item4gamer-worker.env; set +a; node /opt/devplay-platform/workers/item4gamer/inspect-order.mjs DP-O-000024'
~~~

Do not change this into a call to index.mjs for the test order. The daemon dispatches every eligible claimed job and intentionally has no unsafe send-this-order option.

## Operational behavior

- Claims only Item4Gamer jobs in pending/sending with delivery_state=not_sent, no supplier order ID, and a populated current idempotency_key.
- The atomic claim changes the row to dispatching before the outbound request.
- A timeout, transport error, non-JSON response, HTTP 5xx, or ambiguous response becomes UNKNOWN_DELIVERY_STATE and is never automatically resent.
- A structured HTTP 4xx supplier rejection is treated as confirmed failure.
- Orders with a supplier order ID are polled through order/get-order until completed, failed, cancelled, or refunded.
- Delivered codes are stored in supplier_response.delivered_codes.
- Refunds use the existing auto_refund_product_order_after_supplier_rejection RPC. It locks the order and checks the wallet transaction reference, so the refund is applied at most once.
- maintenance_mode or supplier_dispatch_enabled=false pauses new dispatch. Status polling and confirmed-refund reconciliation continue so existing orders remain trackable.
## Catalog synchronization through the static IP

Apply `docs/item4gamer_catalog_sync_worker.sql` in Supabase, then deploy this updated worker and restart it:

~~~bash
cd /opt/devplay-platform
sudo -u devplay git pull --ff-only origin main
sudo -u devplay npm ci --omit=dev
sudo systemctl restart item4gamer-worker.service
sudo journalctl -u item4gamer-worker.service -n 100 --no-pager
~~~

The Admin Item4Gamer buttons no longer call the supplier from Next.js/Vercel. They enqueue a service-role-protected catalog job in Supabase. This daemon atomically claims that job and calls Item4Gamer from the VPS egress IP. Whitelist the VPS public IP at Item4Gamer; do not whitelist a local, residential, or Vercel address. The worker exposes no public HTTP endpoint.