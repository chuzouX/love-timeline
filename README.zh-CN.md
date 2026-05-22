<p align="center">
  <img src="./public/favicon.svg" alt="Kuromi Love App Logo" width="96" height="96" />
</p>

<h1 align="center">Kuromi Love App</h1>

<p align="center">
  一个用于记录纪念日、课程表、生理期和照片画廊的私密恋爱看板，支持前后端分离部署和 CDN 加速。
</p>

基于 React + TypeScript + Vite 的前端应用，配套 Express API 和 SQLite 数据库。

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
```

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
