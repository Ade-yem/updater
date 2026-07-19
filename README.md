# Monorepo

A full-stack monorepo with shared libraries, a React client, and a NestJS API.

## Structure

- `packages/shared` - Shared TypeScript types and interfaces
- `apps/client` - React + TypeScript + Vite frontend
- `apps/api` - NestJS backend API

## Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm (v9+)

### Installation

```bash
pnpm install
```

### Development

Start both client and API:
```bash
pnpm dev:client
pnpm dev:api
```

Or from individual app directories:
```bash
cd apps/client && pnpm dev
cd apps/api && pnpm dev
```

### Building

Build all packages:
```bash
pnpm build
```

Build specific packages:
```bash
pnpm build:client
pnpm build:api
```

## Scripts

- `pnpm dev:client` - Start client development server
- `pnpm dev:api` - Start API development server
- `pnpm build` - Build all apps
- `pnpm build:client` - Build client only
- `pnpm build:api` - Build API only
- `pnpm start:api` - Start API production server
- `pnpm start:client` - Preview client production build

## Shared Library

The `@repo/shared` package contains common types and interfaces used across the monorepo.

Update it at `packages/shared/src/index.ts` and it will be available to all apps.
