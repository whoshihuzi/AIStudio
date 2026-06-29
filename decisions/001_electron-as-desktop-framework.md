# ADR 001: Electron as Desktop Framework

- **Status**: Accepted
- **Date**: 2026-06-27
- **Author**: Alice

---

## Context

AI Studio needs a desktop framework to deliver a native-feeling application on Windows (and eventually macOS/Linux). The framework must support:

1. Integration with a modern JavaScript frontend (React, TypeScript)
2. Embedding of web-based components (Monaco Editor, xterm.js)
3. Filesystem access for workspace management
4. Shell integration for Hermes CLI communication
5. Long-term ecosystem stability

## Decision

Electron was selected as the desktop framework.

## Alternatives Considered

### Tauri
- **Advantages**: Smaller bundle size, Rust-based, better memory footprint
- **Disadvantages**: Smaller ecosystem, some libraries have weaker compatibility, less suitable for rapid iteration during early development
- **Verdict**: Rejected for Phase 1. May be reconsidered for later optimization after the product is stable.

### Progressive Web App (PWA)
- **Advantages**: No installation, cross-platform by nature
- **Disadvantages**: Limited filesystem access, no native window management, cannot spawn child processes reliably
- **Verdict**: Rejected. AI Studio requires deep OS integration.

### Neutralino.js
- **Advantages**: Very lightweight
- **Disadvantages**: Immature ecosystem, small community, uncertain long-term viability
- **Verdict**: Rejected. Too risky for a long-term project.

## Consequences

- Larger bundle size (~150MB baseline)
- Higher baseline memory usage (~100MB)
- Excellent Windows compatibility
- Large community for support and libraries
- Proven at scale (VS Code, Cursor, Slack, Discord)
- Full compatibility with Monaco Editor and xterm.js

## References

- docs/05_TECH_STACK.md — Official technology choices
- docs/04_ARCHITECTURE.md — Layer structure
