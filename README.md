<p align="center">
  <h1 align="center">🔨 Docforge</h1>
  <p align="center"><strong>Zero-config documentation for any repo. One command. Always fresh.</strong></p>
</p>

<p align="center">
  <a href="#quick-start"><img src="https://img.shields.io/badge/setup-30%20seconds-brightgreen" alt="Setup time" /></a>
  <a href="#health-score"><img src="https://img.shields.io/badge/health%20score-0--100%25-blue" alt="Health score" /></a>
  <a href="https://github.com/martinanatale93/docforge/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow" alt="License" /></a>
</p>

<br />

Most doc tools require you to **write the docs yourself**. Docforge **scans your codebase and generates them for you** — overview, architecture diagrams, API reference, and a health score that keeps your team honest.

```bash
npx docforge
```

That's it.

---

## Before → After

**Before:** your repo has no docs.

**After:** Docforge generates a complete `docs/` folder:

```
docs/
 ├── overview.md       ← Project summary, quick start, tech stack
 ├── architecture.md   ← Mermaid diagrams, module breakdown, dependencies
 ├── api.md            ← Auto-detected endpoints with curl examples
 ├── structure.md      ← Annotated directory tree, file stats, comment coverage
 └── health.md         ← Documentation health score (0-100%)
```

Zero config. Zero manual writing.

---

## Quick Start

### CLI (fastest)

```bash
# Run instantly — no install needed
npx docforge

# Or install globally
npm install -g docforge

# Just the health check
docforge health

# Explain a specific folder
docforge explain src/services

# Custom output directory
docforge generate --output documentation
```

### GitHub Action (set and forget)

Add to `.github/workflows/docforge.yml`:

```yaml
name: Documentation

on:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: martinanatale93/docforge@v1
```

Docs are generated and committed on every push. Done.

---

## Health Score

The feature that makes teams adopt Docforge. Every run scores your documentation:

```
📊 Documentation Score: 72% 🟡

  ✅ README              — 15/15 pts
  ✅ README quality       — 10/10 pts
  ✅ Project description  — 5/5 pts
  ❌ Code comments        — 6/15 pts
  ✅ API documentation    — 10/10 pts
  ✅ Tests                — 10/10 pts
  ✅ CI/CD                — 5/5 pts
  ❌ License              — 0/5 pts
  ❌ Contributing guide   — 0/5 pts
  ❌ Changelog            — 0/5 pts
  ✅ Env template         — 5/5 pts
  ✅ Setup scripts        — 10/10 pts

  Missing:
  - License
  - Contributing guide
  - Changelog
```

**Use it in CI to block merges when docs score drops below a threshold.** Teams improve documentation organically because nobody wants to be the one who broke the score.

---

## What It Detects

| Category | Technologies |
|----------|-------------|
| **Languages** | TypeScript, JavaScript, Python, C#, Java, Go, Ruby, Rust, Swift, Kotlin, PHP |
| **Frameworks** | React, Next.js, Vue, Nuxt, Angular, Svelte, Express, Fastify, NestJS, Django, Flask, FastAPI |
| **Databases** | PostgreSQL, MySQL, MongoDB, Redis, Prisma, TypeORM, Sequelize |
| **Infrastructure** | Docker, Terraform, GitHub Actions, GitLab CI, Serverless, AWS CDK, Vercel, Netlify |
| **API Styles** | REST (Express / Fastify / NestJS / .NET / Flask / FastAPI routes) |

---

## Reference

<details>
<summary><strong>Action Inputs</strong></summary>

| Input | Default | Description |
|-------|---------|-------------|
| `output-dir` | `docs` | Where to write generated docs |
| `include-health-score` | `true` | Include health score in output |
| `commit-changes` | `true` | Auto-commit docs back to repo |
| `commit-message` | `docs: auto-update documentation [skip ci]` | Commit message |
| `sections` | `overview,architecture,api,structure` | Which sections to generate |

</details>

<details>
<summary><strong>Action Outputs</strong></summary>

| Output | Description |
|--------|-------------|
| `health-score` | Documentation health score (0–100) |
| `docs-path` | Path to generated docs directory |
| `files-generated` | Number of files generated |

</details>

<details>
<summary><strong>CLI Commands & Options</strong></summary>

| Command | Description |
|---------|-------------|
| `docforge generate` | Generate all documentation (default) |
| `docforge health` | Run health check only |
| `docforge explain <path>` | Explain a specific folder |

| Option | Default | Description |
|--------|---------|-------------|
| `-d, --dir <path>` | `.` | Project root directory |
| `-o, --output <path>` | `docs` | Output directory |
| `--no-health` | — | Skip health score |
| `-s, --sections <list>` | `overview,architecture,api,structure` | Sections to generate |

</details>

---

## Examples

See the [`examples/`](examples/) directory for ready-to-use workflow templates:

- **[Auto-generate on push](examples/auto-doc.yml)** — generate + commit docs on every push to main
- **[PR health check](examples/pr-health-check.yml)** — comment the health score on every pull request

---

## Roadmap

- [ ] OpenAPI/Swagger spec generation
- [ ] Mermaid sequence diagrams from code
- [ ] Multi-language README (i18n)
- [ ] Custom templates / themes
- [ ] Badge generation (embed health score in your README)
- [ ] Search across generated docs
- [ ] AI-powered explanations (optional)

---

## License

MIT
