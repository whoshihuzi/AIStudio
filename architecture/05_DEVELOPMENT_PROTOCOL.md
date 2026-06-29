# 05 — Development Protocol

**The mandatory workflow for every AI agent contributing to AIStudio. This document defines HOW AIStudio is developed.**

---

## Development Lifecycle

Every change — from a one-line fix to a new Milestone — follows this cycle:

```
DESIGN  ──►  ADR  ──►  IMPLEMENT  ──►  VALIDATE  ──►  COMMIT
  │                                   │                │
  │  Plan the approach                │  typecheck     │  Small, atomic
  │  Identify affected modules        │  build         │  Descriptive message
  │  Estimate risk                    │  manual verify │  Update docs
  │                                   │                │
  └── for non-trivial changes ────────┘                │
     write ADR in decisions/                            │
     wait for human approval                            │
```

### Phase Details

#### 1. DESIGN

Before writing code:

1. Read the current Sprint in `docs/09_TODO.md`
2. Read relevant AKB documents for context
3. Trace affected modules in the source
4. Identify: which files change, which interfaces are affected, what could break
5. For non-trivial changes (touching >3 files, changing IPC, adding new abstractions):
   - Present a written plan
   - Wait for human approval

**Rule**: Never begin implementation without a clear understanding of WHAT changes and WHY.

#### 2. ADR (Architecture Decision Record)

For decisions that affect architecture, create an ADR in `decisions/`:

- File naming: `NNN_short-description.md` (next available number)
- Template: Date, status, context, decision, consequences
- Required for: technology changes, new architectural patterns, significant trade-offs
- Not required for: bug fixes, UI polish, documentation-only changes

Each ADR must reference the Milestone it supports. The Decision Log in `04_ROADMAP.md` provides an index.

#### 3. IMPLEMENT

Implement in the smallest possible increments:

- Each commit should be a single logical change
- Prefer 5 commits of 50 lines over 1 commit of 250 lines
- Never mix unrelated changes in the same commit
- Follow naming conventions in `03_DESIGN_PRINCIPLES.md`
- Respect layer boundaries (Presentation → Application → Domain ← Infrastructure)
- Never break the build — every commit must pass typecheck

#### 4. VALIDATE

After implementation, verify:

```bash
npm run typecheck    # Must pass: zero errors
npm run build        # Must pass: zero errors
```

Manual verification:
- If UI changed: launch `npm run dev` and visually confirm
- If IPC changed: verify round-trip works
- If persistence changed: verify data survives restart

Do NOT skip manual verification for UI or IPC changes. TypeScript cannot catch runtime bugs.

#### 5. COMMIT

Commit with a descriptive message following this format:

```
<type>(<scope>): <subject>
```

Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`

Examples:
- `feat(dashboard): add MilestoneProgressCard with Sprint status`
- `fix(session): flush pending save on window close`
- `docs(architecture): establish Architecture Knowledge Base`
- `refactor(adapter): extract parseLine to pure function`

After commit, update relevant documentation (see Documentation Synchronization below).

---

## Milestone Rules

### Milestone Structure

A Milestone is the smallest unit of tracked work that:
- Has a clear, verifiable goal
- Can be completed in a single session
- Leaves the project in a runnable state
- Produces at least one commit

### Milestone Workflow

1. **Plan**: Write the plan in a design document or directly in the chat. Identify scope, risks, dependencies.
2. **Approve**: Human reviews and approves the plan.
3. **Implement**: Follow the Development Lifecycle above.
4. **Verify**: `npm run typecheck` + `npm run build` + manual check.
5. **Record**: Update `logs/development.md` with a summary.

### What a Milestone Must NEVER Do

- Leave the build broken
- Introduce features not in the plan
- Modify >20 files without explicit approval
- Skip documentation updates
- Merge unrelated changes

---

## Quality Gates

Every commit and every Milestone must pass these gates:

### Gate 1: Typecheck

```bash
npm run typecheck
```

- Zero TypeScript errors
- No `any` without justification
- No unused imports or variables

### Gate 2: Build

```bash
npm run build
```

- electron-vite produces valid output in `out/`
- All three entries (main, preload, renderer) compile
- No build warnings that indicate real problems

### Gate 3: Manual Verification

- **UI changes**: Launch `npm run dev`, visually confirm the change
- **IPC changes**: Send a test message, confirm round-trip
- **Persistence changes**: Create a session, restart, confirm it loads
- **New adapters/runtimes**: Test with a real CLI command

### Gate 4: Architecture Compliance

Before completing a Milestone, verify:

- [ ] Renderer imports no adapter-specific code
- [ ] IPC API uses generic names only
- [ ] No layer boundary violation
- [ ] New code follows existing patterns
- [ ] Session persistence works on exit

---

## Documentation Synchronization

When code changes, documentation must follow. The mapping:

| Code Change | Documentation to Update |
|---|---|
| New file or module | `02_ARCHITECTURE.md` Module Map |
| New Sprint completed | `docs/09_TODO.md` (check off tasks) |
| Milestone completed | `logs/development.md` (summary) |
| Architecture decision | `decisions/NNN_*.md` (new ADR) |
| New design principle discovered | `03_DESIGN_PRINCIPLES.md` |
| Session ends | `07_PROJECT_CONTEXT.md` (handoff) |
| New dependency added | `docs/05_TECH_STACK.md` (if official) |

**Rule**: Documentation updates are part of the Milestone, not an afterthought. A Milestone is not complete until its documentation is current.

---

## Git Workflow

### Commit Rules

1. **Atomic commits**: One logical change per commit
2. **Working build**: The project must build on every commit
3. **Descriptive messages**: Future you should understand the commit without reading the diff
4. **No secrets**: Never commit `.env`, credentials, API keys, or session data
5. **Clean working tree**: Before starting a new Milestone, the working tree should be clean (or WIP properly tracked)

### Branch Strategy

- `master` is the single source of truth
- Feature branches are created for experimental work but merged quickly
- No long-lived branches without explicit approval

### Stable Baseline

- A Stable Baseline is a tagged commit where all current Milestones are complete
- Tag format: `v<major>.<minor>.<patch>` (semantic versioning)
- Baseline criteria:
  - [ ] All planned Sprints complete
  - [ ] `npm run typecheck` passes
  - [ ] `npm run build` passes
  - [ ] Manual verification passes
  - [ ] Documentation is current
  - [ ] Working tree is clean

### Tag Policy

- Tag only from `master`
- Tag only clean, verified commits
- Annotated tags with release notes
- Never move or delete a published tag

---

## Architecture Boundary Rules

These boundaries are enforced by the architecture. Violating them is a bug.

### Main Process Boundary

```
Main Process owns:
  - File system access (fs, path)
  - Child processes (spawn, exec)
  - Git operations
  - Session persistence (read/write JSON)
  - IPC handlers (ipcMain)

Main Process NEVER:
  - Renders UI
  - Imports React
  - Touches the DOM
```

### Preload Boundary

```
Preload owns:
  - contextBridge.exposeInMainWorld()
  - IPC channel definitions
  - Type declarations for the Renderer

Preload NEVER:
  - Contains business logic
  - Imports adapter-specific code
  - Exposes raw Node.js APIs
```

### Renderer Boundary

```
Renderer owns:
  - UI rendering (React components)
  - User interaction
  - Zustand state management
  - AgentBridge (IAgentRuntime wrapper)

Renderer NEVER:
  - Accesses the file system directly
  - Imports Node.js modules
  - Knows which adapter is running
  - Contains adapter names in any file
```

### Crossing Boundaries

All cross-boundary communication goes through IPC with these channel naming rules:

- `agent:*` — agent lifecycle (send, abort, events)
- `session:*` — session CRUD (create, list, load, save, delete)
- `dashboard:*` — dashboard data (future)

Never invent ad-hoc IPC channels. Every new channel should follow `domain:action`.

---

## Refactoring Rules

### When Refactoring Is Allowed

- The Milestone plan explicitly includes it
- It's a prerequisite for the planned feature
- It addresses a documented tech debt item
- It's limited to <5 files

### When Refactoring Is NOT Allowed

- "While I'm here" changes unrelated to the current Milestone
- Renaming public interfaces without approval
- Changing architectural patterns without an ADR
- "Cleaning up" code that works but looks different from your preference

### Refactoring Protocol

1. State what you want to change and why
2. Confirm the change is within scope of the current Milestone
3. Make the change as a separate commit from feature work
4. Verify the build still passes
5. Update documentation if the refactoring changes any documented pattern

---

## Definition of Done

A Milestone is **Done** when ALL of these are true:

- [ ] All planned features are implemented
- [ ] `npm run typecheck` passes (zero errors)
- [ ] `npm run build` passes
- [ ] Manual verification confirms correct behavior
- [ ] All modified/created files are committed
- [ ] Working tree is clean (or remaining WIP is intentional and documented)
- [ ] `logs/development.md` has a Milestone summary
- [ ] `docs/09_TODO.md` reflects completed tasks
- [ ] Architecture changes are documented (ADR or AKB update)
- [ ] No new `any` types or lint violations introduced

A Milestone that passes typecheck and build but skips documentation is NOT done.

---

## Release Checklist

When preparing a Stable Baseline release:

- [ ] All planned Milestones for this baseline are Done (see Definition of Done)
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] `npm start` launches without errors
- [ ] Session persistence verified (create → restart → load)
- [ ] IPC round-trip verified (send message → receive response)
- [ ] `docs/10_CHANGELOG.md` updated with all changes since last baseline
- [ ] `docs/09_TODO.md` reflects current Sprint state
- [ ] `architecture/04_ROADMAP.md` Decision Log current
- [ ] Working tree clean, all changes committed
- [ ] Tag created: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
- [ ] Tag pushed: `git push origin vX.Y.Z`
