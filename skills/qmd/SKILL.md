---
name: qmd
description: Local hybrid search for markdown notes and docs. Use when searching notes, finding related content, or retrieving documents from indexed collections.
homepage: https://github.com/tobi/qmd
metadata: {"vyasa-u-code":{"emoji":"🔍","os":["darwin","linux"],"requires":{"bins":["bun","qmd"]}}}
---

# qmd - Quick Markdown Search

Local search engine for Markdown notes, docs, and knowledge bases. Index once, search fast.

## When to use (trigger phrases)

- "search my notes / docs / knowledge base"
- "find related notes"
- "retrieve a markdown document from my collection"
- "search local markdown files"

## Default behavior (important)

- Prefer `qmd search` (BM25). It's typically instant and should be the default.
- Use `qmd vsearch` only when keyword search fails and you need semantic similarity (can be very slow on a cold start).
- Avoid `qmd query` unless the user explicitly wants the highest quality hybrid results and can tolerate long runtimes/timeouts.

## Prerequisites

- Bun >= 1.0.0
- macOS: `brew install sqlite` (SQLite extensions)
- Ensure PATH includes: `$HOME/.bun/bin`

Install Bun (macOS): `brew install oven-sh/bun/bun`

## Install

```bash
bun install -g https://github.com/tobi/qmd
```

## Setup

```bash
qmd collection add /path/to/notes --name notes --mask "**/*.md"
qmd context add qmd://notes "Description of this collection"  # optional
qmd embed  # one-time to enable vector + hybrid search
```

## What it indexes

- Intended for Markdown collections (commonly `**/*.md`).
- "Messy" Markdown is fine: chunking is content-based (roughly a few hundred tokens per chunk).
- Not a replacement for code search; use code search tools for repositories/source trees.

## Search modes

- `qmd search` (default): fast keyword match (BM25)
- `qmd vsearch` (last resort): semantic similarity (vector). Often slow.
- `qmd query` (generally skip): hybrid search + LLM reranking.

## Performance notes

- `qmd search` is typically instant.
- `qmd vsearch` can be ~1 minute on some machines.
- `qmd query` adds LLM reranking, can be even slower.

## Common commands

```bash
qmd search "query"             # default
qmd vsearch "query"
qmd query "query"
qmd search "query" -c notes     # Search specific collection
qmd search "query" -n 10        # More results
qmd search "query" --json       # JSON output
qmd search "query" --all --files --min-score 0.3
```

## Useful options

- `-n <num>`: number of results
- `-c, --collection <name>`: restrict to a collection
- `--all --min-score <num>`: return all matches above a threshold
- `--json` / `--files`: agent-friendly output formats
- `--full`: return full document content

## Retrieve

```bash
qmd get "path/to/file.md"       # Full document
qmd get "#docid"                # By ID from search results
qmd multi-get "journals/2025-05*.md"
```

## Maintenance

```bash
qmd status                      # Index health
qmd update                      # Re-index changed files
qmd embed                       # Update embeddings
```

## Example usage in vyasa-u-code

```bash
# Search notes
vyasa-u-code bash "qmd search 'meeting notes'"

# Get specific document
vyasa-u-code bash "qmd get notes/meeting.md"

# Check index status
vyasa-u-code bash "qmd status"
```
