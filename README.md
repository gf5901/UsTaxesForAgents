<div align="center">
<h1><a href="//ustaxes.org">USTaxes</a></h1>

[![Github Latest Release][release-badge]][github-release]

</div>

> **This fork (UsTaxesForAgents)** is a **CLI-only** build aimed at **AI agents and automation**. Generate federal and state tax PDFs from a JSON input file—no web app or desktop UI. Ideal for Cursor, Claude Code, or other agents that fill forms from structured data.

## What is UsTaxes?

UsTaxes is a free, open-source tax filing application. This fork provides a command-line tool that produces Federal 1040 and state return PDFs from validated JSON. No server; no personal data leaves your machine.

## Supported income data

Most income and deduction information from the following forms are supported for tax years 2020–2025:

- W2
- 1099-INT
- 1099-DIV
- 1099-B
- 1098-E
- 1099-R (normal distributions from IRA and pension)
- SSA-1099

Schedules and forms attached to 1040 include Schedule 1 (E, 1098-E), 2, 3, 8812, B, D, E, F1040-V, F8949, F8889, F8959, F8960, and others as implemented per year.

## Supported states

See `/src/forms/Y20XX/stateForms/` for implemented states (e.g. Utah, Illinois) and coverage. Non-filing states (e.g. WA, TX, FL) require no state return.

## Get started

**Requirements:** Node.js 20+ (see `.nvmrc`; Node 24 recommended). Use [nvm](https://github.com/nvm-sh/nvm) if needed:

```sh
nvm use
```

### Install and run CLI

```sh
npm ci
npm run cli -- my-files/parsed-import.json -o my-files/output
```

Options: `--output, -o DIR` (default: `my-files/output`), `--year, -y YYYY`, `--federal-only`.  
Input JSON must include `activeYear` and the matching year key (e.g. `Y2025`). Output is one PDF per return (e.g. `LastName-1040.pdf`, `LastName-UT.pdf`).

### Development

```sh
npm test          # run tests (Jest)
npm run lint      # ESLint + Prettier
npm run lint:fix  # fix lint and format
npm run formgen   # generate form scaffolding from a PDF (see scripts/formgen.ts)
```

## Project layout

- `scripts/run-cli.ts` — CLI entry; reads JSON, builds forms, writes PDFs
- `scripts/dump-pdf-fields.ts` — dump filled PDF field values for verification
- `src/forms/Y20XX/` — per-year federal and state form logic
- `src/core/` — data types, PDF filling, validation
- `public/forms/Y20XX/` — blank IRS/state PDF templates

## Contributing

See [Contributing guide](docs/CONTRIBUTING.md) and [Architecture](docs/ARCHITECTURE.md).

## Getting help

[File an issue][github-issues] or open a discussion on the repo.

[github-release]: https://github.com/gf5901/UsTaxesForAgents/releases/latest
[release-badge]: https://badgen.net/github/release/gf5901/UsTaxesForAgents
[github-issues]: https://github.com/gf5901/UsTaxesForAgents/issues
