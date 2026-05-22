# CLAUDE.md

Project-specific context and conventions for play-helpers.

## Project Overview

This is a pnpm monorepo for creating gameplay development kits. The repo contains shared libraries in `packages/` and standalone applications in `apps/`.

## Monorepo Structure

- `packages/` - Shared libraries, kits, and utilities
- `apps/` - Standalone applications that consume packages

## Conventions

### Package Naming

- Packages: `@play-helpers/<name>` or `play-helpers-<name>`
- Apps: `play-helpers-app-<name>`

### TypeScript

All packages should use TypeScript. Enable strict mode.

### Versioning

Use independent versioning for packages (`"version": "workspace:*"`).

### Dependencies

- Internal dependencies: Use `workspace:*` protocol
- External dependencies: Pin major versions

## Commands

```bash
pnpm install     # Install all dependencies
pnpm build       # Build all packages
pnpm test        # Run tests
pnpm lint        # Lint all packages
pnpm clean       # Clean all build artifacts
```

## Adding Packages

1. Create directory in `packages/` or `apps/`
2. Initialize with `pnpm init`
3. Add to workspace via dependency resolution
