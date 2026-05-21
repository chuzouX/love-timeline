# React + TypeScript + Vite

## Local app

This app now has a local API server backed by SQLite.

1. Copy `.env.example` to `.env` if you want to change the default PIN or database path.
2. Run `npm run dev:all` to start both the API server and Vite.
3. Open `http://127.0.0.1:5173/`.

Default API settings:

- API: `http://0.0.0.0:3001`
- Host: `0.0.0.0`
- Frontend proxy: `/api/*`
- Frontend API base URL: `VITE_API_BASE_URL=/api`
- Default PIN: `1314`
- SQLite file: `server/data/kuromi.sqlite`

Useful commands:

- `npm run server` starts the API in watch mode.
- `npm run server:start` starts the API once.
- `npm run dev` starts only the Vite frontend.
- `npm run build` type-checks and builds the frontend.
- `npm run lint` runs ESLint.

## Linux deployment

Do not deploy a `node_modules` directory copied from Windows. This project uses
native packages such as `better-sqlite3`, so dependencies should be installed on
the Linux server:

```sh
cd /www/wwwroot/loveapi.chuzoux.top/kuromi-app
rm -rf node_modules
npm ci
npm run server:start
```

If the existing server copy is already in place and you only need to clear the
current `tsx` permission error, the updated `server:start` script runs through
`node --import tsx` instead of executing `node_modules/.bin/tsx` directly.

The API listens on `HOST=0.0.0.0` by default so it can accept external network
connections. Set `HOST=127.0.0.1` in `.env` only when the API should be reachable
from the local machine or a local reverse proxy.

If the frontend is hosted on a different domain from the API, set
`VITE_API_BASE_URL=https://loveapi.chuzoux.top/api` before building the frontend.
Gallery image URLs are resolved from this value, so uploaded images will load
from the API domain instead of the frontend domain.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
