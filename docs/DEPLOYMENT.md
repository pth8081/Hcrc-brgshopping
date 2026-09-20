# Deploying to a public VPS (Ubuntu/CentOS)

This covers a standard setup: the Node app runs as a systemd service on
`127.0.0.1:3000`, and **nginx sits in front of it as a reverse proxy,
terminating TLS** — the app itself is never exposed directly to the
internet. Commands below are for Ubuntu (`apt`); CentOS/RHEL equivalents
(`dnf`/`yum`, `firewalld` instead of `ufw`) are noted where they differ.

> This project's CSP and cookie-free JWT design already assume the app may
> run over plain HTTP (see the Security section in the main README) — that
> was correct for the original offline/internal deployment target. **Once
> this is reachable from the public internet, plain HTTP is not acceptable**:
> a login request would carry the user's password in cleartext over the
> network. TLS via nginx (step 6) is what fixes that; nothing in the Node
> app itself needs to change to support it.

## 0. Before you start: what you need decided

- A domain name pointed at the VPS (an A record), or you can't get a real
  TLS certificate (Let's Encrypt validates ownership of the domain).
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

## 2. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # should print v20.x
```

CentOS/RHEL: swap the first line for `curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -`
and `apt install` for `dnf install -y nodejs`.

## 3. Get the code and install dependencies

```bash
git clone <your repo URL> /home/deploy/brgshopping
cd /home/deploy/brgshopping
npm ci --omit=dev
npm install -g pm2   # or skip this and use the systemd unit in step 5 instead — pick one, not both
```

`npm run build:css` is **not** needed here — `public/css/style.css` is a
committed build artifact; it's already in the repo.

## 4. Configure the environment

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
| `ADMIN_PASSWORD` | **Leave unset.** The seeder in step 5 will generate one and print it once — see below for why a fixed default is a bad idea on a real deployment. |

## 5. Create the schema and the admin account

```bash
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

The second command prints something like:

```
===========================================================
 Admin account created — SAVE THIS PASSWORD, it is shown once:
 Email:    admin@brgshopping.local
 Password: 8f2iK3mN9xQz1pLr
===========================================================
```

**Copy that password now** — it is not stored anywhere in plaintext (only
its bcrypt hash goes into the database), and this output will scroll away.
If you lose it, the only way back in is to run `npx sequelize-cli db:seed:undo` then
`db:seed:all` again for a fresh one (this deletes and recreates the admin
user row — fine before real orders reference it, not after).

There is currently no self-service "change password" screen in the app
(tracked in the main README's Next steps) — to use a specific password
instead of a generated one, set `ADMIN_PASSWORD` in `.env` *before* running
`db:seed:all` the first time.

If you're bringing over real catalog/customer/order data from an existing
Odoo installation, run that migration now, before real traffic hits the
site — see [`MIGRATION.md`](./MIGRATION.md).

## 6. Run the app as a service

Pick **one** of these — don't run both against the same port.

### Option A: systemd (no extra tooling)

Copy [`deploy/brgshopping.service`](../deploy/brgshopping.service) to
`/etc/systemd/system/brgshopping.service`, edit the `User=`,
`WorkingDirectory=` and `EnvironmentFile=` lines to match your paths, then:

```bash
sudo cp deploy/brgshopping.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now brgshopping
sudo systemctl status brgshopping
journalctl -u brgshopping -f   # tail logs
```

systemd restarts the process automatically if it crashes and starts it on
boot — that's the main thing "not production-ready" was missing.

### Option B: PM2

```bash
pm2 start src/server.js --name brgshopping
pm2 save
pm2 startup   # prints a command to run once, so PM2 itself survives a reboot
```

## 7. Put nginx in front, with real TLS

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

Certbot sets up automatic renewal on its own (a systemd timer or cron job);
confirm it with `sudo certbot renew --dry-run`.

## 8. Firewall

Only expose 80/443 (nginx) and SSH publicly — the app port (3000) and MSSQL
should only be reachable from `localhost` / your internal network, never
directly from the internet.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

CentOS/RHEL (`firewalld`):
```bash
sudo firewall-cmd --permanent --add-service=ssh --add-service=http --add-service=https
sudo firewall-cmd --reload
```

## 9. Backups

Nothing in this repo backs up the database automatically. At minimum, set
up a nightly `sqlcmd`/`BACKUP DATABASE` job (or your MSSQL host's built-in
backup feature, e.g. Azure SQL's automatic backups) and copy the backup
file off the VPS — a backup that lives on the same disk as the database
doesn't survive a disk failure.

## 10. Verify

```bash
curl -I https://example.com/health
```
should return `HTTP/2 200`. Then load the site in a browser, log in as the
admin account from step 5, and change or add real catalog data before
announcing the site publicly.

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
