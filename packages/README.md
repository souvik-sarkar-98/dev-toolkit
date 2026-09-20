# Shared packages

Two stacks, same npm scope `@ssdev-toolkit/*`:

| Folder | Stack | Catalog |
|--------|--------|---------|
| [`backend/`](backend/README.md) | API libraries (`@ssdev-toolkit/nestjs-*`) | [backend/README.md](backend/README.md) |
| [`frontend/`](frontend/README.md) | Angular / React adapters (shared cores under `frontend/shared`) | [frontend/README.md](frontend/README.md) |

npm workspaces are `packages/backend/*` and `packages/frontend/*` (one level; `frontend/shared/*` is **not** a workspace). Those two parent folders themselves are not packages.

```bash
npm run build   # compile frontend shared cores, then turbo-build both stacks
```
