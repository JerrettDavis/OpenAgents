# Development Helper Scripts

Root-level development scripts to manage the monorepo. All scripts are defined in `package.json`.

## Core Commands

### `pnpm dev`

Start development servers for all Node packages (Next.js, etc.) in parallel.

**Usage:**

```bash
pnpm dev
```

**What it does:**

- Starts Next.js dev server on `http://localhost:3000`
- Watches TypeScript
- Hot-reloads on file changes

### `pnpm build`

Build all packages (frontend, backend libraries, etc.).

**Usage:**

```bash
pnpm build                # Build all packages
pnpm build:web           # Build Next.js only
```

### `pnpm start`

Start production servers (after build).

**Usage:**

```bash
pnpm start                # Start all production servers
pnpm start:web           # Start Next.js production server
```

## Code Quality

### `pnpm format`

Auto-format code using Prettier.

**Usage:**

```bash
pnpm format              # Format all TypeScript, JavaScript, JSON, Markdown
pnpm format:check       # Check formatting without changes
```

### `pnpm lint`

Run linters across all packages (if configured).

**Usage:**

```bash
pnpm lint                # Lint all packages
```

### `pnpm type-check`

Run TypeScript type checking across all packages.

**Usage:**

```bash
pnpm type-check          # Type-check all packages
```

## Monorepo Utilities

### `pnpm list`

Display monorepo structure with dependency tree.

**Usage:**

```bash
pnpm list                # Show workspace packages and versions
```

### `pnpm clean`

Remove `node_modules` and build artifacts.

**Usage:**

```bash
pnpm clean               # Clean all packages
```

**Useful after:**

- Switching branches with conflicting dependencies
- Debugging strange module resolution issues
- Large dependency updates

## Docker Commands

### `pnpm docker:up`

Start containerized environment.

**Usage:**

```bash
pnpm docker:up           # Start services in background
```

### `pnpm docker:down`

Stop containerized environment.

**Usage:**

```bash
pnpm docker:down         # Stop and remove containers
```

### `pnpm docker:logs`

Stream logs from running containers.

**Usage:**

```bash
pnpm docker:logs         # Follow logs
```

## Filtering Commands

Run commands on specific packages:

```bash
pnpm --filter orchestrator-web build    # Build Next.js only
pnpm --filter orchestrator-web dev      # Dev server for Next.js only
pnpm -r run build                       # Build all packages with a build script
```

## Tips

- **First time setup:** `pnpm install` then `pnpm dev`
- **Stuck dependencies:** Run `pnpm clean` then `pnpm install`
- **Want to add a package to one workspace:** `pnpm --filter orchestrator-web add some-package`
- **Check installed versions:** `pnpm list --depth=0`

---

**Backend (.NET)** commands are documented in `apps/orchestrator-api/README.md` (when created).

**Frontend (Next.js)** commands are in `apps/orchestrator-web/package.json` and can be run via `pnpm --filter orchestrator-web <script>`.
