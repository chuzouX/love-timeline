<p align="center">
  <img src="./public/favicon.svg" alt="Kuromi Love App Logo" width="96" height="96" />
</p>

<h1 align="center">Kuromi Love App</h1>

<p align="center">
  A private relationship dashboard for anniversaries, schedules, period tracking, and a fast CDN-friendly photo gallery.
</p>

[中文文档](./README.zh-CN.md)

# 这个项目归档以后不会维护了，祝大家找到自己的真爱，不要委屈自己

React + TypeScript + Vite frontend with an Express API backed by SQLite.

## Table Of Contents

- [Features](#features)
- [Stack](#stack)
- [Project Layout](#project-layout)
- [Requirements](#requirements)
- [Environment](#environment)
- [Local Development](#local-development)
- [Gallery Images](#gallery-images)
- [API Reference](#api-reference)
- [Frontend Deployment: EdgeOne Pages](#frontend-deployment-edgeone-pages)
- [API Deployment: VPS](#api-deployment-vps)
- [EdgeOne CDN Rules For API Domain](#edgeone-cdn-rules-for-api-domain)
- [Troubleshooting](#troubleshooting)

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
| `VITE_UMAMI_BASE_URL` | `https://umami.chuzoux.top` | Umami instance base URL |
| `VITE_UMAMI_SCRIPT_URL` | `https://umami.chuzoux.top/script.js` | Umami analytics script URL |
| `VITE_UMAMI_WEBSITE_ID` | `2ff203ed-6094-4e37-b401-f6ab0f17c662` | Umami website ID |
| `VITE_UMAMI_SHARE_ID` | empty | Umami share ID used to display public visit stats |
| `VITE_UMAMI_TIMEZONE` | `Asia/Shanghai` | Timezone for Umami stats queries |

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

## API Reference

Base URL:

```txt
/api
```

For separated frontend/API domains:

```txt
https://loveapi.chuzoux.top/api
```

All write endpoints require:

```txt
Authorization: Bearer <token>
```

Tokens are returned by `POST /api/auth/unlock` and expire after 12 hours. Error responses use this shape:

```json
{
  "error": "message"
}
```

### Endpoint Summary

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | Health check |
| `POST` | `/api/auth/unlock` | No | Exchange PIN for JWT |
| `GET` | `/api/profile` | No | Read relationship profile |
| `PUT` | `/api/profile` | Yes | Update relationship profile |
| `GET` | `/api/events` | No | List calendar events |
| `POST` | `/api/events` | Yes | Create calendar event |
| `PUT` | `/api/events/:id` | Yes | Update calendar event |
| `DELETE` | `/api/events/:id` | Yes | Delete calendar event |
| `GET` | `/api/gallery` | No | List gallery images |
| `POST` | `/api/gallery` | Yes | Upload gallery image |
| `DELETE` | `/api/gallery/:id` | Yes | Delete gallery image |
| `GET` | `/api/gallery/files/:filename` | No | Read gallery image file |
| `GET` | `/api/schedule` | No | Read schedule |
| `PUT` | `/api/schedule` | Yes | Replace schedule |
| `GET` | `/api/period` | No | Read period tracker data |
| `PUT` | `/api/period/config` | Yes | Update period config |
| `POST` | `/api/period/records` | Yes | Create period record |
| `PUT` | `/api/period/records/:id` | Yes | Update period record |
| `DELETE` | `/api/period/records/:id` | Yes | Delete period record |

### Auth

`POST /api/auth/unlock`

Request:

```json
{
  "pin": "1314"
}
```

Response:

```json
{
  "token": "jwt-token"
}
```

Status codes:

- `200`: PIN accepted.
- `401`: PIN is incorrect.

### Profile

Profile object:

```json
{
  "relationshipStartDate": "2023-10-20",
  "herName": "Alice",
  "himName": "Bob"
}
```

`GET /api/profile`

- Returns the profile object.

`PUT /api/profile`

- Requires auth.
- `relationshipStartDate` must use `YYYY-MM-DD`.
- `herName` and `himName` can be strings or `null`.

### Events

Event object:

```json
{
  "id": 1,
  "name": "Anniversary",
  "date": "2023-10-20",
  "calendarType": "solar",
  "lunarMonth": null,
  "lunarDay": null,
  "lunarIsLeapMonth": 0,
  "time": "20:00",
  "startTime": "20:00",
  "endTime": null,
  "recurrence": "yearly",
  "icon": "heart",
  "description": "First day together",
  "color": "bg-pink-100 text-pink-600",
  "tag": "ANNIVERSARY",
  "sortOrder": 1
}
```

Rules:

- `date` uses `YYYY-MM-DD`.
- `calendarType` is `solar` or `lunar`.
- Lunar events require `lunarMonth` from `1` to `12` and `lunarDay` from `1` to `30`.
- `time`, `startTime`, and `endTime` use `HH:mm` or `null`.
- `recurrence` is `none` or `yearly`.

Endpoints:

- `GET /api/events`: returns `Event[]`, ordered by `sortOrder`, `date`, and `id`.
- `POST /api/events`: requires auth, creates an event, returns `201`.
- `PUT /api/events/:id`: requires auth, updates an event.
- `DELETE /api/events/:id`: requires auth, returns `204`.

### Gallery

Gallery image object:

```json
{
  "id": 1,
  "filename": "1779307067238-edc4244fa93cb.jpg",
  "originalName": "photo.jpg",
  "mimeType": "image/jpeg",
  "width": 1600,
  "height": 1200,
  "size": 135610,
  "createdAt": "2026-05-22 08:30:00",
  "aspectRatio": 1.3333333333333333,
  "url": "/api/gallery/files/1779307067238-edc4244fa93cb.jpg"
}
```

Endpoints:

- `GET /api/gallery`: returns `GalleryImage[]`, ordered by aspect ratio and creation time.
- `POST /api/gallery`: requires auth and `multipart/form-data`.
- `DELETE /api/gallery/:id`: requires auth, deletes the database row and file, returns `204`.
- `GET /api/gallery/files/:filename`: returns the static image file with long cache headers.

Upload request:

```txt
Content-Type: multipart/form-data
field name: image
max file size: 12 MB
accepted type: image/*
```

### Schedule

Schedule object:

```json
{
  "days": ["Monday", "Tuesday"],
  "times": ["08:00", "10:10"],
  "items": [
    {
      "id": 1,
      "dayIndex": 0,
      "timeIndex": 0,
      "subject": "Math",
      "person": "her",
      "duration": 2
    }
  ]
}
```

Rules:

- `person` is `her`, `him`, or `both`.
- `dayIndex` must be valid for the `days` array.
- `timeIndex` must be valid for the `times` array.
- `duration` must be an integer from `1` to `10`.

Endpoints:

- `GET /api/schedule`: returns the schedule.
- `PUT /api/schedule`: requires auth, replaces the whole schedule.

### Period Tracker

Period response:

```json
{
  "config": {
    "id": 1,
    "cycleDays": 28,
    "periodDays": 5
  },
  "records": [
    {
      "id": 1,
      "startDate": "2026-05-10",
      "endDate": null,
      "note": null,
      "symptoms": [],
      "createdAt": "2026-05-22 08:30:00"
    }
  ],
  "prediction": {
    "nextStartDate": "2026-06-07",
    "daysUntilNext": 16,
    "ovulationDate": "2026-05-24",
    "ovulationWindowStart": "2026-05-19",
    "ovulationWindowEnd": "2026-05-25",
    "daysUntilOvulation": 2,
    "daysUntilOvulationWindow": 0,
    "currentPhase": "ovulation",
    "currentPhaseLabel": "ovulation"
  }
}
```

Rules:

- `cycleDays` must be from `15` to `60`.
- `periodDays` must be from `1` to `14`.
- `startDate` and `endDate` use `YYYY-MM-DD`.
- `symptoms` is a string array.
- `currentPhase` is `menstrual`, `follicular`, `ovulation`, `luteal`, or `null`.

Endpoints:

- `GET /api/period`: returns config, records, and prediction.
- `PUT /api/period/config`: requires auth, updates `cycleDays` and `periodDays`.
- `POST /api/period/records`: requires auth, creates a record, returns `201`.
- `PUT /api/period/records/:id`: requires auth, updates a record.
- `DELETE /api/period/records/:id`: requires auth, returns `204`.

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
VITE_UMAMI_BASE_URL=https://umami.chuzoux.top
VITE_UMAMI_SCRIPT_URL=https://umami.chuzoux.top/script.js
VITE_UMAMI_WEBSITE_ID=2ff203ed-6094-4e37-b401-f6ab0f17c662
VITE_UMAMI_SHARE_ID=your-share-id
VITE_UMAMI_TIMEZONE=Asia/Shanghai
```

Umami analytics is loaded only when both `VITE_UMAMI_SCRIPT_URL` and `VITE_UMAMI_WEBSITE_ID` are present at build time. The footer visit counter also requires `VITE_UMAMI_SHARE_ID`; this is the ID from the Umami share URL, not the website ID.

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
