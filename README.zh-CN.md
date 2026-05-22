<p align="center">
  <img src="./public/favicon.svg" alt="Kuromi Love App Logo" width="96" height="96" />
</p>

<h1 align="center">Kuromi Love App</h1>

<p align="center">
  一个用于记录纪念日、课程表、生理期和照片画廊的私密恋爱看板，支持前后端分离部署和 CDN 加速。
</p>

基于 React + TypeScript + Vite 的前端应用，配套 Express API 和 SQLite 数据库。

## 目录

- [功能](#功能)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [环境要求](#环境要求)
- [环境变量](#环境变量)
- [本地开发](#本地开发)
- [画廊图片](#画廊图片)
- [API 接口文档](#api-接口文档)
- [前端部署：EdgeOne Pages](#前端部署edgeone-pages)
- [API 部署：VPS](#api-部署vps)
- [EdgeOne API 域名 CDN 规则](#edgeone-api-域名-cdn-规则)
- [故障排查](#故障排查)

## 功能

- 恋爱资料与纪念日倒计时。
- 日历事件与周期性提醒。
- 课程表与生理期记录，数据存储在 SQLite。
- 画廊上传、删除、懒加载、CDN 友好的图片路由，以及上传前图片压缩。
- 基于 PIN 码解锁和 JWT 鉴权。

## 技术栈

- 前端：React 19、TypeScript、Vite、Tailwind CSS。
- 后端：Express 5、`better-sqlite3`。
- 上传：Multer、`image-size`。
- 推荐部署：前端使用 EdgeOne Pages，后端 API 使用 VPS + EdgeOne CDN。

## 项目结构

```txt
src/                    前端应用
server/index.ts          Express API 与 SQLite 表结构
server/data/             本地 SQLite 数据库，已被 Git 忽略
server/uploads/gallery/  画廊上传图片，已被 Git 忽略
scripts/                 维护脚本
edgeone.json             EdgeOne Pages 构建和缓存配置
```

## 环境要求

- 前端构建建议使用 Node.js 20+。
- API 可运行在 Node.js 18+，但原生依赖必须在实际运行 API 的服务器和 Node 版本下安装。
- `npm run compress` 需要 Python 3 和 Pillow。

## 环境变量

复制 `.env.example` 为 `.env`：

```sh
cp .env.example .env
```

可用变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3001` | API 端口 |
| `HOST` | `0.0.0.0` | API 监听地址 |
| `PIN_CODE` | `1314` | 解锁 PIN |
| `JWT_SECRET` | `change-this-local-secret` | JWT 签名密钥 |
| `DATABASE_PATH` | `./server/data/kuromi.sqlite` | SQLite 文件路径 |
| `VITE_API_BASE_URL` | `/api` | 前端请求 API 的基础地址 |
| `VITE_UMAMI_BASE_URL` | `https://umami.chuzoux.top` | Umami 实例基础地址 |
| `VITE_UMAMI_SCRIPT_URL` | `https://umami.chuzoux.top/script.js` | Umami 统计脚本地址 |
| `VITE_UMAMI_WEBSITE_ID` | `2ff203ed-6094-4e37-b401-f6ab0f17c662` | Umami 站点 ID |
| `VITE_UMAMI_SHARE_ID` | 空 | 用于展示公开访问量的 Umami 分享 ID |
| `VITE_UMAMI_TIMEZONE` | `Asia/Shanghai` | 查询 Umami 统计数据时使用的时区 |

如果前端和 API 使用不同域名，构建前设置：

```env
VITE_API_BASE_URL=https://loveapi.chuzoux.top/api
```

## 本地开发

安装依赖：

```sh
npm ci
```

同时启动 API 和 Vite：

```sh
npm run dev:all
```

打开：

```txt
http://127.0.0.1:5173/
```

常用命令：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 只启动 Vite 前端 |
| `npm run server` | 以监听模式启动 API |
| `npm run server:start` | 单次启动 API |
| `npm run dev:all` | 同时启动 API 和前端 |
| `npm run build` | 类型检查并构建前端 |
| `npm run lint` | 运行 ESLint |
| `npm run preview` | 预览构建后的前端 |
| `npm run compress` | 原地压缩画廊图片 |

## 画廊图片

上传图片存储在：

```txt
server/uploads/gallery/
```

API 对外访问路径：

```txt
/api/gallery/files/:filename
```

前端会基于 `VITE_API_BASE_URL` 规范化图片 URL，因此同域部署和前后端分离部署都可使用。

新上传图片会在浏览器端先压缩：

- 跳过 GIF 和 SVG。
- 其他图片类型会通过 canvas 渲染，并在压缩后更小时以 JPEG 上传。
- 最长边限制为 `1600px`。
- JPEG 质量为 `0.78`。

已有画廊图片可以原地压缩：

```sh
npm run compress
```

该命令保持图片路径和文件名不变，并自动尝试 `python3`、`python` 和 Windows `py`。

如果 Linux 服务器因为 PEP 668 无法直接安装 Pillow，建议使用虚拟环境：

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install pillow
npm run compress
```

## API 接口文档

基础地址：

```txt
/api
```

前后端分离部署时：

```txt
https://loveapi.chuzoux.top/api
```

所有写接口都需要请求头：

```txt
Authorization: Bearer <token>
```

Token 由 `POST /api/auth/unlock` 返回，有效期为 12 小时。错误响应格式：

```json
{
  "error": "message"
}
```

### 接口总览

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| `GET` | `/api/health` | 否 | 健康检查 |
| `POST` | `/api/auth/unlock` | 否 | 使用 PIN 换取 JWT |
| `GET` | `/api/profile` | 否 | 读取恋爱资料 |
| `PUT` | `/api/profile` | 是 | 更新恋爱资料 |
| `GET` | `/api/events` | 否 | 获取日历事件 |
| `POST` | `/api/events` | 是 | 创建日历事件 |
| `PUT` | `/api/events/:id` | 是 | 更新日历事件 |
| `DELETE` | `/api/events/:id` | 是 | 删除日历事件 |
| `GET` | `/api/gallery` | 否 | 获取画廊图片列表 |
| `POST` | `/api/gallery` | 是 | 上传画廊图片 |
| `DELETE` | `/api/gallery/:id` | 是 | 删除画廊图片 |
| `GET` | `/api/gallery/files/:filename` | 否 | 读取画廊图片文件 |
| `GET` | `/api/schedule` | 否 | 读取课程表 |
| `PUT` | `/api/schedule` | 是 | 替换课程表 |
| `GET` | `/api/period` | 否 | 读取生理期数据 |
| `PUT` | `/api/period/config` | 是 | 更新生理期配置 |
| `POST` | `/api/period/records` | 是 | 创建生理期记录 |
| `PUT` | `/api/period/records/:id` | 是 | 更新生理期记录 |
| `DELETE` | `/api/period/records/:id` | 是 | 删除生理期记录 |

### 鉴权

`POST /api/auth/unlock`

请求体：

```json
{
  "pin": "1314"
}
```

响应：

```json
{
  "token": "jwt-token"
}
```

状态码：

- `200`：PIN 正确。
- `401`：PIN 错误。

### 恋爱资料

资料对象：

```json
{
  "relationshipStartDate": "2023-10-20",
  "herName": "Alice",
  "himName": "Bob"
}
```

`GET /api/profile`

- 返回资料对象。

`PUT /api/profile`

- 需要鉴权。
- `relationshipStartDate` 必须使用 `YYYY-MM-DD`。
- `herName` 和 `himName` 可以是字符串或 `null`。

### 日历事件

事件对象：

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

规则：

- `date` 使用 `YYYY-MM-DD`。
- `calendarType` 为 `solar` 或 `lunar`。
- 农历事件要求 `lunarMonth` 为 `1` 到 `12`，`lunarDay` 为 `1` 到 `30`。
- `time`、`startTime`、`endTime` 使用 `HH:mm` 或 `null`。
- `recurrence` 为 `none` 或 `yearly`。

接口：

- `GET /api/events`：返回 `Event[]`，按 `sortOrder`、`date`、`id` 排序。
- `POST /api/events`：需要鉴权，创建事件，返回 `201`。
- `PUT /api/events/:id`：需要鉴权，更新事件。
- `DELETE /api/events/:id`：需要鉴权，返回 `204`。

### 画廊

图片对象：

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

接口：

- `GET /api/gallery`：返回 `GalleryImage[]`，按宽高比和创建时间排序。
- `POST /api/gallery`：需要鉴权，使用 `multipart/form-data`。
- `DELETE /api/gallery/:id`：需要鉴权，删除数据库记录和文件，返回 `204`。
- `GET /api/gallery/files/:filename`：返回静态图片文件，带长期缓存响应头。

上传请求：

```txt
Content-Type: multipart/form-data
字段名：image
最大文件大小：12 MB
允许类型：image/*
```

### 课程表

课程表对象：

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

规则：

- `person` 为 `her`、`him` 或 `both`。
- `dayIndex` 必须在 `days` 数组范围内。
- `timeIndex` 必须在 `times` 数组范围内。
- `duration` 必须是 `1` 到 `10` 的整数。

接口：

- `GET /api/schedule`：返回课程表。
- `PUT /api/schedule`：需要鉴权，替换整个课程表。

### 生理期记录

生理期响应：

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

规则：

- `cycleDays` 必须为 `15` 到 `60`。
- `periodDays` 必须为 `1` 到 `14`。
- `startDate` 和 `endDate` 使用 `YYYY-MM-DD`。
- `symptoms` 是字符串数组。
- `currentPhase` 为 `menstrual`、`follicular`、`ovulation`、`luteal` 或 `null`。

接口：

- `GET /api/period`：返回配置、记录和预测。
- `PUT /api/period/config`：需要鉴权，更新 `cycleDays` 和 `periodDays`。
- `POST /api/period/records`：需要鉴权，创建记录，返回 `201`。
- `PUT /api/period/records/:id`：需要鉴权，更新记录。
- `DELETE /api/period/records/:id`：需要鉴权，返回 `204`。

## 前端部署：EdgeOne Pages

仓库包含 `edgeone.json`：

- 安装命令：`npm ci`
- 构建命令：`npm run build`
- 输出目录：`dist`
- Node 版本：`20.18.0`
- `/assets/*`：`Cache-Control: public, max-age=31536000, immutable`
- HTML 和入口路径：`Cache-Control: no-cache`

如果 API 部署在 `loveapi.chuzoux.top`，请在 EdgeOne Pages 环境变量中设置：

```env
VITE_API_BASE_URL=https://loveapi.chuzoux.top/api
VITE_UMAMI_BASE_URL=https://umami.chuzoux.top
VITE_UMAMI_SCRIPT_URL=https://umami.chuzoux.top/script.js
VITE_UMAMI_WEBSITE_ID=2ff203ed-6094-4e37-b401-f6ab0f17c662
VITE_UMAMI_SHARE_ID=your-share-id
VITE_UMAMI_TIMEZONE=Asia/Shanghai
```

只有在构建时同时存在 `VITE_UMAMI_SCRIPT_URL` 和 `VITE_UMAMI_WEBSITE_ID` 时，前端才会加载 Umami 统计脚本。底部访问量展示还需要 `VITE_UMAMI_SHARE_ID`；这是 Umami 分享链接里的 ID，不是网站 ID。

## API 部署：VPS

不要把 Windows 上的 `node_modules` 上传到 Linux。项目使用了 `better-sqlite3` 这类原生依赖，必须在 Linux 服务器上安装依赖。

推荐部署步骤：

```sh
cd /www/wwwroot/loveapi.chuzoux.top/kuromi-app
git pull
npm ci
pm2 restart yz-love-api
```

如果更换 Node 版本后原生模块报错：

```sh
rm -rf node_modules
npm ci
pm2 restart yz-love-api
```

API 默认监听 `HOST=0.0.0.0`。只有当 API 只需要被本机 Nginx 或本机反代访问时，才把 `HOST` 改成 `127.0.0.1`。

## EdgeOne API 域名 CDN 规则

针对 `loveapi.chuzoux.top`，按以下顺序配置规则。

画廊图片：

```regex
^/api/gallery/files/[^?]+\.(jpg|jpeg|png|webp|gif|bmp|avif|JPG|JPEG|PNG|WEBP|GIF|BMP|AVIF)$
```

推荐动作：

- 节点缓存 TTL：30 到 90 天。
- 浏览器缓存 TTL：7 到 30 天。
- Cache Key 查询字符串：全部忽略。

动态 API：

```regex
^/api/.+
```

推荐动作：

- 节点缓存 TTL：不缓存。
- 浏览器缓存 TTL：不缓存。
- 保留查询字符串、Cookie 和 `Authorization` 请求头。
- 如果可用，开启动态加速或智能路由。

## 故障排查

`tsx: Permission denied`

- 原因：Linux 正在执行从其他系统复制过来的 `node_modules/.bin/tsx`。
- 处理：拉取最新代码，并在 Linux 上执行 `npm ci`。当前脚本已使用 `node --import tsx`。

`better_sqlite3.node was compiled against a different Node.js version`

- 原因：原生模块是为另一个 Node ABI 编译的。
- 处理：

```sh
rm -rf node_modules
npm ci
pm2 restart yz-love-api
```

`502 Bad Gateway`

- CDN 或 Nginx 能收到请求，但上游 API 没有正常响应。
- 查看 PM2 日志：

```sh
pm2 logs yz-love-api --lines 100
```

`git pull` 提示本地改动会被覆盖

- 先查看服务器本地改动：

```sh
git status
git diff
```

- 如果服务器本地改动可以丢弃：

```sh
git restore server/index.ts
git pull
```
