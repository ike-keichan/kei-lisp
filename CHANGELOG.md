# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-08

### Changed

- Migrated build tool from webpack to tsup (CJS + ESM dual output)
- Migrated package manager from npm + Makefile to pnpm
- Switched Node.js version management to nodenv
- Restructured as npm-publishable package (library + CLI)
- Added ESLint (flat config), Prettier, and cspell for code quality
- Moved documentation files to `docs/` directory

### Added

- TypeScript type definitions (`.d.ts`)
- `src/index.js` as library entry point
- `src/cli.js` as CLI entry point
- MIT License

## [1.0.0] - 2020-12-01

### Added

- Initial release
- Lisp interpreter running in Node.js CLI
