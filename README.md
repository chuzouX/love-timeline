# Kuromi Love App

React + TypeScript + Vite frontend with an Express API backed by SQLite.

## Features

- Relationship profile and anniversary countdowns.
- Calendar events and recurring reminders.
- Schedule and period tracker data stored in SQLite.
- Gallery upload, delete, lazy loading, CDN-friendly image routes, and client-side image compression.
- PIN unlock flow backed by JWT.

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS.
- API: Express 5, SQLite through `better-sqlite3`.
- Uploads: Multer, `image-size`.
- Deployment target: EdgeOne Pages for frontend, VPS + EdgeOne CDN for API.

## Project Layout

```txt
src/                    Frontend application
server/index.ts          Express API and SQLite schema
server/data/             Local SQLite database, ignored by Git
server/uploads/gallery/  Gallery uploads, ignored by Git
scripts/                 Maintenance scripts
edgeone.json             EdgeOne Pages build and cache config
```

## Requirements

- Node.js 20+ recommended for frontend builds.
- Node.js 18+ can run the API, but native dependencies must be installed on the same server and Node version that runs it.
- Python 3 with Pillow is required only for `npm run compress`.

## Environment

Copy `.env.example` to `.env` for local API settings:

```sh
cp .env.example .env
```

Available variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | API port |
| `HOST` | `0.0.0.0` | API listen host |
| `PIN_CODE` | `1314` | Unlock PIN |
| `JWT_SECRET` | `change-this-local-secret` | JWT signing secret |
| `DATABASE_PATH` | `./server/data/kuromi.sqlite` | SQLite file path |
| `VITE_API_BASE_URL` | `/api` | Frontend API base URL |

For separated frontend/API domains, set this before building the frontend:

```env
VITE_API_BASE_URL=https://loveapi.chuzoux.top/api
```

## Local Development

Install dependencies:

```sh
npm ci
```

Start API and Vite together:

```sh
npm run dev:all
```

Open:

```txt
http://127.0.0.1:5173/
```

Useful commands:

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite only |
| `npm run server` | Start API in watch mode |
| `npm run server:start` | Start API once |
| `npm run dev:all` | Start API and frontend together |
| `npm run build` | Type-check and build frontend |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview built frontend |
| `npm run compress` | Compress gallery images in place |

## Gallery Images

Uploaded gallery files are stored in:

```txt
server/uploads/gallery/
```

The API serves them from:

```txt
/api/gallery/files/:filename
```

The frontend normalizes returned image URLs against `VITE_API_BASE_URL`, so this works for both same-domain and separated frontend/API deployments.

New uploads are compressed in the browser before upload:

- GIF and SVG are skipped.
- Other image types are rendered through canvas and uploaded as JPEG when that makes the file smaller.
- Longest side is limited to `1600px`.
- JPEG quality is `0.78`.

Existing gallery images can be compressed in place:

```sh
npm run compress
```

This keeps every image path and filename unchanged. The command tries `python3`, `python`, and Windows `py` automatically.

If Pillow is missing on a Linux server with an externally managed Python environment, prefer a virtual environment:

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install pillow
npm run compress
```

## Frontend Deployment: EdgeOne Pages

The repository includes `edgeone.json`:

- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Node version: `20.18.0`
- `/assets/*`: `Cache-Control: public, max-age=31536000, immutable`
- HTML and other entry paths: `Cache-Control: no-cache`

Set this Pages environment variable when the API is hosted on `loveapi.chuzoux.top`:

```env
VITE_API_BASE_URL=https://loveapi.chuzoux.top/api
```

## API Deployment: VPS

Do not upload a Windows `node_modules` directory to Linux. This project uses native dependencies such as `better-sqlite3`, so dependencies must be installed on the Linux server.

Recommended deployment steps:

```sh
cd /www/wwwroot/loveapi.chuzoux.top/kuromi-app
git pull
npm ci
pm2 restart yz-love-api
```

If native modules fail after changing Node versions:

```sh
rm -rf node_modules
npm ci
pm2 restart yz-love-api
```

The API listens on `HOST=0.0.0.0` by default. Use `HOST=127.0.0.1` only when the API is meant to be reachable only from local Nginx or another local reverse proxy.

## EdgeOne CDN Rules For API Domain

For `loveapi.chuzoux.top`, configure rules in this order.

Gallery files:

```regex
^/api/gallery/files/[^?]+\.(jpg|jpeg|png|webp|gif|bmp|avif|JPG|JPEG|PNG|WEBP|GIF|BMP|AVIF)$
```

Recommended actions:

- Node cache TTL: 30 to 90 days.
- Browser cache TTL: 7 to 30 days.
- Cache key query string: ignore all.

Dynamic API:

```regex
^/api/.+
```

Recommended actions:

- Node cache TTL: no cache.
- Browser cache TTL: no cache.
- Keep query strings, cookies, and `Authorization` headers.
- Enable dynamic acceleration or smart routing if available.

## Troubleshooting

`tsx: Permission denied`

- Cause: Linux is trying to execute a copied `node_modules/.bin/tsx` shim.
- Fix: pull the latest code and install dependencies on Linux with `npm ci`. Scripts use `node --import tsx`.

`better_sqlite3.node was compiled against a different Node.js version`

- Cause: native module was compiled for a different Node ABI.
- Fix:

```sh
rm -rf node_modules
npm ci
pm2 restart yz-love-api
```

`502 Bad Gateway`

- The CDN or Nginx can reach the request path, but the upstream API is not responding.
- Check PM2 logs:

```sh
pm2 logs yz-love-api --lines 100
```

`git pull` reports local changes would be overwritten

- Inspect server edits first:

```sh
git status
git diff
```

- If server-only edits are disposable:

```sh
git restore server/index.ts
git pull
```
