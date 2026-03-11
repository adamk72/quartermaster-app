# Deployment Guide — Self-Hosting on macOS

## Prerequisites

- Spectrum (or similar ISP) router with port forwarding
- DuckDNS account with a subdomain (e.g., `quartermasterapp.duckdns.org`)
- Homebrew installed
- Caddy installed (`brew install caddy`)
- DuckDNS installed (`brew install duckdns`)

## 1. DuckDNS — Dynamic DNS

DuckDNS keeps your domain pointed at your public IP, even if it changes.

**Config file:** `~/.duckdns`

```
DOMAIN=quartermasterapp
TOKEN=your-duckdns-token-here
```

**Start the service (updates IP every 5 minutes):**

```bash
brew services start duckdns
```

**Verify it's working:**

```bash
/opt/homebrew/opt/duckdns/bin/duckdns && cat ~/.duckdns.log
# Should say "OK"
```

**Force-update IP manually:**

```bash
curl "https://www.duckdns.org/update?domains=quartermasterapp&token=YOUR_TOKEN&ip=$(curl -s -4 ifconfig.me)"
```

## 2. Port Forwarding — Spectrum Router

Log into your router at `http://192.168.1.1` and add these port forwarding rules:

| External Port | Internal IP        | Internal Port | Protocol |
|---------------|--------------------|---------------|----------|
| 80            | Your local IP      | 80            | TCP      |
| 443           | Your local IP      | 443           | TCP      |

Find your local IP with: `ipconfig getifaddr en0`

**Important:** Port 80 is needed for Let's Encrypt certificate renewal. Port 443 is for HTTPS traffic.

## 3. Caddy — Reverse Proxy + Auto-TLS

Caddy handles HTTPS certificates automatically via Let's Encrypt.

**Config file:** `/etc/caddy/Caddyfile`

```
quartermasterapp.duckdns.org {
    reverse_proxy localhost:9090
}
```

**Start Caddy with tmux (recommended):**

The brew service (`brew services start caddy`) can conflict with itself due to `KeepAlive` restart loops. Running Caddy directly with `sudo` in tmux is more reliable:

```bash
# Disable the brew service if previously enabled
brew services stop caddy

# Kill any lingering caddy processes
sudo pkill -9 -f caddy

# Run in tmux
tmux new -s caddy
sudo caddy run --config /etc/caddy/Caddyfile
# Detach: Ctrl+B, then D
# Reattach later: tmux attach -t caddy
```

**If Caddy fails with "address already in use" on port 2019:**

```bash
sudo kill -9 $(sudo lsof -i :2019 -t)
# Then retry the caddy run command
```

## 4. Build & Run the App

**Build (compiles frontend into static files + Go binary):**

```bash
cd /Users/adam/Code/Personal/quartermaster-app
make build
```

**Run the server:**

```bash
cd backend && STATIC_DIR=cmd/server/static ../quartermaster-app
```

**Run in background with tmux:**

```bash
tmux new -s quartermaster
cd /Users/adam/Code/Personal/quartermaster-app/backend
STATIC_DIR=cmd/server/static ../quartermaster-app
# Detach: Ctrl+B, then D
# Reattach later: tmux attach -t quartermaster
```

## 5. Accessing the App

| From where     | URL                                          |
|----------------|----------------------------------------------|
| Remote browser | `https://quartermasterapp.duckdns.org`       |
| Local browser  | `http://localhost:9090`                       |
| Local dev mode | `http://localhost:1337` (via `make dev`)      |

**Note:** You cannot access the DuckDNS URL from the same network (most routers don't support NAT hairpinning). Use `localhost:9090` locally.

## Troubleshooting

**Caddy won't start — port 443 in use:**

```bash
sudo lsof -i :443 | grep LISTEN
# Kill whatever is using it, then retry
```

**TLS certificate fails — firewall/timeout:**
- Verify port 80 is forwarded (needed for ACME challenge)
- Check DuckDNS is pointing to your current public IP: `curl -s -4 ifconfig.me`
- Check macOS firewall is not blocking incoming connections

**Blank page loads but no JS/CSS:**
- Verify `STATIC_DIR` points to the directory with `index.html` and `assets/`
- Check: `ls backend/cmd/server/static/` should show `index.html`, `assets/`, `favicon.svg`

**Backend 404 on root:**
- Backend is running but not serving static files — set `STATIC_DIR=cmd/server/static`
