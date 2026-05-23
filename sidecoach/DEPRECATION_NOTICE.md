# Deprecation Notice: Impeccable Commands

**Status**: Soft deprecation (v2.1.9 and later)

## Summary

The `/impeccable` command family is being soft-deprecated in favor of the unified Sidecoach command system. Impeccable remains functional but is no longer the primary entry point for design workflows.

## Why Deprecate?

1. **Unified entry point**: Sidecoach provides a single, consistent command interface
2. **Better discoverability**: Commands are grouped by workflow phase (Research/Implement/Review/Special)
3. **Improved onboarding**: Interactive menu (`/sidecoach` with no args) replaces ad-hoc Impeccable commands
4. **Consistent memory**: All flows now record to Sidecoach flow history and session memory
5. **Extensibility**: New features (Improv integration, PRODUCT.md setup) built into Sidecoach

## Migration Path

### Old: Impeccable commands
```
/impeccable craft button
/impeccable audit
/impeccable polish
/impeccable live
```

### New: Sidecoach equivalent
```
/sidecoach implement button     # craft → implement
/sidecoach review               # audit → review (includes audit flow)
/sidecoach review               # polish → review (includes polish flow)
/sidecoach rapid button         # live → rapid (with Improv integration)
```

## What Still Works

- All `/impeccable` commands remain functional
- Full feature parity with Sidecoach flows
- No breaking changes; no forced migration

## What's New

- **Rich taxonomy**: Commands grouped by phase (Research/Implement/Review/Special)
- **Interactive menu**: Type `/sidecoach` or `/sidecoach list` for guided selection
- **Improv integration**: Flow N now detects Improv availability for live iteration
- **PRODUCT.md setup**: `/sidecoach teach` generates strategy documents
- **Unified memory**: All flow execution recorded in Sidecoach history

## Timeline

- **Current**: Soft deprecation (Impeccable still fully supported)
- **v2.2 (Future)**: Impeccable commands show deprecation notice; Sidecoach encouraged
- **v3.0 (Future)**: Impeccable commands removed; Sidecoach becomes primary interface

## Recommended Actions

1. **For new projects**: Use `/sidecoach <command>` instead of `/impeccable`
2. **For existing workflows**: No action required; continue using Impeccable as long as it works
3. **For team documentation**: Update internal guides to show Sidecoach commands
4. **For automations**: Migrate custom automations to Sidecoach routing when convenient

## Command Mapping Reference

See `COMMAND_FLOW_MAPPING.md` for complete mapping of Sidecoach commands to flows.

---

**Generated**: 2026-05-23
**Deprecation version**: v2.1.9
