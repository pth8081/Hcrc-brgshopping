# Deploying to a public VPS (Ubuntu/CentOS)

Two supported setups, both process-managed by **PM2**:

- **[Option 1: PM2 only](#option-1-pm2-only-no-reverse-proxy)** — the Node
  app is the only thing listening on the public ports. Simpler, one less
  moving part, no nginx to install or configure. For real HTTPS in this
  setup, the app terminates TLS itself (see below) — there's no reverse
  proxy to do it instead.
- **[Option 2: PM2 + nginx](#option-2-pm2--nginx)** — nginx sits in front
  as a reverse proxy and terminates TLS; the Node app only ever talks
  plain HTTP to `localhost`. More moving parts, but nginx's TLS handling
  (via certbot's nginx plugin) is simpler to keep renewed automatically,
  and nginx can do things like serving multiple sites on one IP or
  buffering slow clients that this app doesn't do itself.

If you're unsure, **Option 2 is the more common, more battle-tested setup**
for a public site. Option 1 is fine too — it just puts a bit more of the
TLS/port-binding work on the app and PM2 instead of on nginx.

Steps 1–4 below are shared; they end with the app's dependencies installed
and its database ready. Then jump to whichever option you picked.

## 0. Before you start: what you need decided

- A domain name pointed at the VPS (an A record) if you want a real TLS
  certificate — both options below use [Let's Encrypt](https://letsencrypt.org/)
  via `certbot`, which validates ownership of the domain.
- Where MSSQL will run. Two realistic options:
  - **SQL Server on Linux**, installed on this same VPS or another one you
    control — see [Microsoft's install docs](https://learn.microsoft.com/sql/linux/sql-server-linux-setup)
    for Ubuntu/RHEL.
  - **A managed instance** (Azure SQL Database, or any MSSQL you already
    run elsewhere) — then this VPS just needs network access to it.
  Either way, this guide assumes you already have a running MSSQL instance
  and its connection details before step 4.

## 1. Provision the server

- Ubuntu 22.04+ or CentOS Stream/RHEL 9+, at least 1 vCPU / 1GB RAM for the
  Node app itself (MSSQL, if colocated, needs much more — 2GB+ RAM minimum
  per Microsoft's own requirements).
- Create a non-root user to run the app under (never run a public-facing
  Node process as root):
  ```bash
  sudo adduser deploy
  sudo usermod -aG sudo deploy   # optional, only if this user also administers the box
  su - deploy
  ```

## 2. Install Node.js and PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v            # should print v20.x
sudo npm install -g pm2
```

CentOS/RHEL: swap the first line for
`curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -` and
`apt install` for `dnf install -y nodejs`.

## 3. Get the code and install dependencies

```bash
git clone <your repo URL> /home/deploy/brgshopping
cd /home/deploy/brgshopping
npm ci
```

This installs devDependencies too — deliberately: `sequelize-cli` (a
devDependency) is what step 4 below uses to run migrations/seeding, so
skipping it with `npm ci --omit=dev` would make `npx sequelize-cli` fall
back to fetching a copy from the registry on the spot instead of using the
version pinned in `package-lock.json`. `npm run build:css` itself is
**not** needed here regardless — `public/css/style.css` is a committed
build artifact; it's already in the repo.

## 4. Configure the environment, create the schema, seed the admin

```bash
cp .env.example .env
nano .env   # or your editor of choice
```

At minimum, set for real:

| Variable | What to put |
|---|---|
| `NODE_ENV` | `production` — enables combined access logs, hides stack traces in error responses |
| `JWT_SECRET` | A long random value: `openssl rand -base64 48`. Never reuse the placeholder from `.env.example`. |
| `MSSQL_HOST` / `MSSQL_PORT` / `MSSQL_DATABASE` / `MSSQL_USER` / `MSSQL_PASSWORD` | Your real MSSQL instance from step 0 |
| `MSSQL_ENCRYPT` | `true` if your MSSQL instance has a real TLS certificate (recommended for anything not on `localhost`); `MSSQL_TRUST_SERVER_CERTIFICATE` only matters when `MSSQL_ENCRYPT=true` with a self-signed cert |
| `ADMIN_PASSWORD` | **Leave unset.** The seed step below generates one and prints it once — see why in the main README. |

Leave `PORT`, `TLS_KEY_PATH`, `TLS_CERT_PATH`, `HTTP_REDIRECT_PORT` alone
for now — each option below says exactly what to set.

```bash
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

The seed command prints something like:

```
===========================================================
 Admin account created — SAVE THIS PASSWORD, it is shown once:
 Email:    admin@brgshopping.local
 Password: 8f2iK3mN9xQz1pLr
===========================================================
```

**Copy that password now** — it is not stored anywhere in plaintext (only
its bcrypt hash goes into the database), and this output will scroll away.
If you lose it, the only way back in is `npx sequelize-cli db:seed:undo`
then `db:seed:all` again for a fresh one (this deletes and recreates the
admin user row — fine before real orders reference it, not after). There
is currently no self-service "change password" screen in the app.

If you're bringing over real catalog/customer/order data from an existing
Odoo installation, run that migration now, before real traffic hits the
site — see [`MIGRATION.md`](./MIGRATION.md).

---

## Option 1: PM2 only, no reverse proxy

The app binds directly to the public port(s). Two variants: plain HTTP
(simplest, but **not recommended** once this is reachable from the public
internet — see the warning below), or the app terminating HTTPS itself.

### Allow Node to bind to ports 80/443 without running as root

Linux reserves ports below 1024 for root by default. Rather than run the
whole Node process as root (a much bigger blast radius if the app is ever
compromised), grant just the ability to bind low ports to the `node`
binary:

```bash
sudo setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")"
```

Re-run this after any Node version upgrade — it re-links to a new binary.

### 1a. Plain HTTP (simplest — only if you understand the risk)

```bash
# In .env: PORT=80, TLS_KEY_PATH and TLS_CERT_PATH left unset
pm2 start src/server.js --name brgshopping
pm2 save
pm2 startup   # prints a command to run once, so PM2 survives a reboot
```

**Everything — including login passwords and JWTs — travels unencrypted**
over the network. Fine for a truly internal/offline deployment (the
original target this app's CSP was designed for); **not fine** for
anything the public internet can reach. Use 1b instead unless you have TLS
handled somewhere else already (e.g. a CDN/load balancer in front that you
control).

### 1b. The app terminates HTTPS itself

Get a certificate first, with nothing else on port 80 yet (certbot's
`--standalone` mode runs its own temporary web server to prove domain
ownership):

```bash
sudo apt install -y certbot   # CentOS/RHEL: dnf install -y certbot
sudo certbot certonly --standalone -d example.com
# certificate + key land in /etc/letsencrypt/live/example.com/
```

Let PM2's user read the certificate (Let's Encrypt's directory is root-only
by default):

```bash
sudo setfacl -R -m u:deploy:rX /etc/letsencrypt/live /etc/letsencrypt/archive
```

Then in `.env`:
```
PORT=443
TLS_KEY_PATH=/etc/letsencrypt/live/example.com/privkey.pem
TLS_CERT_PATH=/etc/letsencrypt/live/example.com/fullchain.pem
HTTP_REDIRECT_PORT=80
```

```bash
pm2 start src/server.js --name brgshopping
pm2 save
pm2 startup
```

The app now serves HTTPS on 443 and redirects any plain HTTP request on 80
to it (`src/server.js` — no nginx involved).

**Renewal**: certbot's certificates expire every 90 days. Node only reads
the certificate files once, at startup, so a renewal needs the app
restarted to pick up the new files. Add a renewal hook:

```bash
sudo tee /etc/letsencrypt/renewal-hooks/deploy/restart-brgshopping.sh > /dev/null <<'EOF'
#!/bin/sh
su - deploy -c "pm2 restart brgshopping"
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/restart-brgshopping.sh
```

Standalone mode's HTTP-01 challenge needs port 80 free for a few seconds
during renewal, which conflicts with the app's own port-80 redirect
listener. Use a stop/start pre/post hook instead of `--standalone`'s
built-in server for renewals:

```bash
sudo crontab -e
# add:
0 3 * * * certbot renew --pre-hook "su - deploy -c 'pm2 stop brgshopping'" --post-hook "su - deploy -c 'pm2 start brgshopping'" --quiet
```

(This replaces the deploy-hook script above with an equivalent pre/post
pair — pick one mechanism, not both, to avoid restarting twice.)

### Firewall (Option 1)

Only the port(s) the app actually listens on need to be public.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp    # or just 80 if you're doing 1a
sudo ufw enable
```
CentOS/RHEL (`firewalld`):
```bash
sudo firewall-cmd --permanent --add-service=ssh --add-service=http --add-service=https
sudo firewall-cmd --reload
```

### Verify (Option 1)

```bash
curl -Ik https://example.com/health   # or http:// for variant 1a
```
should return `200`.

---

## Option 2: PM2 + nginx

### Run the app under PM2, on a local-only port

```bash
# In .env: PORT=3000 (default), TLS_KEY_PATH/TLS_CERT_PATH left unset —
# the app only ever needs to speak plain HTTP to nginx on localhost.
pm2 start src/server.js --name brgshopping
pm2 save
pm2 startup   # prints a command to run once, so PM2 survives a reboot
```

`pm2 status`, `pm2 logs brgshopping`, and `pm2 restart brgshopping` are
your day-to-day process management commands.

### Install nginx and point it at the app

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```
(CentOS/RHEL: `dnf install -y nginx certbot python3-certbot-nginx`)

Copy [`deploy/nginx.conf.example`](../deploy/nginx.conf.example) to
`/etc/nginx/sites-available/brgshopping` (Debian/Ubuntu) or
`/etc/nginx/conf.d/brgshopping.conf` (CentOS/RHEL), replace `example.com`
with your real domain, then:

```bash
# Ubuntu only — CentOS/RHEL has no sites-enabled step
sudo ln -s /etc/nginx/sites-available/brgshopping /etc/nginx/sites-enabled/

sudo nginx -t                 # validates the config before reloading
sudo systemctl reload nginx
sudo certbot --nginx -d example.com   # obtains a cert and rewrites the config for HTTPS + HTTP->HTTPS redirect
```

Certbot's nginx plugin sets up automatic renewal on its own (a systemd
timer or cron job) **and** reloads nginx afterwards — no manual hook needed
here, unlike Option 1. Confirm it with `sudo certbot renew --dry-run`.

### Firewall (Option 2)

Only 80/443 (nginx) and SSH should be public — the app's own port (3000)
should only be reachable from `localhost`.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```
CentOS/RHEL (`firewalld`):
```bash
sudo firewall-cmd --permanent --add-service=ssh --add-service=http --add-service=https
sudo firewall-cmd --reload
```

### Verify (Option 2)

```bash
curl -I https://example.com/health
```
should return `HTTP/2 200`.

---

## 5. Backups

Nothing in this repo backs up the database automatically. At minimum, set
up a nightly `sqlcmd`/`BACKUP DATABASE` job (or your MSSQL host's built-in
backup feature, e.g. Azure SQL's automatic backups) and copy the backup
file off the VPS — a backup that lives on the same disk as the database
doesn't survive a disk failure.

## 6. Log in and lock things down

Load the site in a browser, log in as the admin account from step 4, and
add real catalog data before announcing the site publicly.

## What this deliberately doesn't cover

- **Payment gateway integration.** Checkout uses manual admin payment-status
  confirmation (COD/bank-transfer/e-wallet), not a live VNPay/Momo
  integration — see the main README/commit history for why. Wire up a real
  gateway before accepting real online payments.
- **Outbound email/SMS.** Order notifications are in-app only (no SMTP/SMS
  credentials configured). Add a provider if customers need email/SMS
  notifications.
- **CI/automated tests.** Verification so far has been manual (curl +
  Playwright scripts against a real MSSQL instance during development), not
  a test suite wired into a pipeline.
