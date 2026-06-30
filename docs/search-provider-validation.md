# M11b — Metadata Search Provider Validation

**Date**: 2026-06-28

---

## Search Methods

| Method | Scoring | Description |
|---|---|---|
| `findByExactName(name)` | 3 | Case-insensitive exact match |
| `findByPrefix(prefix)` | 2 | Name starts with prefix |
| `findBySubstring(text)` | 1 | Name contains text (deduplicated) |
| `findByExtension(ext)` | 1 | Extension match |

---

## Test Cases

| Query | Method | Expected |
|---|---|---|
| `"README.md"` | Exact | 1 match, score 3 |
| `"read"` | Prefix | Files starting with "read" |
| `"main"` | Substring | Files containing "main" |
| `"ts"` | Extension | All .ts files |
| `"json"` | Extension | All .json files |
| `"xxxxxxxx"` | Substring | Empty result (no error) |
| `"README"` | Substring | Case-insensitive: finds README.md |

---

## Scoring

| Priority | Score |
|---|---|
| Exact match | 3 |
| Prefix match | 2 |
| Substring match | 1 |
| Extension match | 1 |

Results sorted by score desc, then name asc. Limited to N (default 100).

---

## Architecture

```
SearchProvider
  └── WorkspaceIndexStore.getAll()
        └── WorkspaceIndexer.scan()
              └── WorkspaceProvider

No fs. No content. No ripgrep. No fuzzy.
```

---

## Dependencies

| Module | SearchProvider Dependency |
|---|---|
| WorkspaceProvider | ✗ |
| RuntimeManager | ✗ |
| Dashboard | ✗ |
| Renderer | ✗ |
| HermesAdapter | ✗ |

---

## IPC

| Channel | Input | Output |
|---|---|---|
| `workspace:search:name` | `query, limit?` | `SearchResult[]` |

---

## Build

- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — all entries pass
