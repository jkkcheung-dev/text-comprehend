# Argument Map: Claude Code is running in production across multi-million-line monorepos, decades-old legacy systems, distributed architectures spanning dozens of repositories, and at organizations with thousands of developers. These environments present challenges that smaller, simpler codebases don’t, whether that’s build commands that differ across every subdirectory or legacy code spread across folders with no shared root.

> Source: `sampleText.txt`

## Main Claims

### Claim: The tooling harness determines Claude Code performance more than the model alone.

**Evidence:**
1. [reasoning, strong] The ecosystem built around the model—the harness—determines how Claude Code performs more than the model alone.
   *Source: lines 15-16*
2. [reasoning, strong] CLAUDE.md files give Claude the codebase knowledge it needs to do anything well.
   *Source: lines 19-19*
3. [example, moderate] Hooks enforce rules deterministically and produce more consistent results than relying on Claude to remember an instruction.
   *Source: lines 21-21*

**Assumptions:**
- The model alone cannot encode all team-specific conventions and infrastructure knowledge.
- External tooling can reliably augment the model where it falls short.

**Gaps:**
- Does not quantify the relative performance impact of each harness layer versus model improvement.

---

### Claim: Teams must actively review and prune their Claude Code configuration as models improve, or old instructions will degrade performance.

**Evidence:**
1. [example, strong] CLAUDE.md files that guided Claude through patterns it used to struggle with may either become unnecessary or actively constraining when the next model ships.
   *Source: lines 52-52*
2. [reasoning, moderate] Skills and hooks built to compensate for specific model limitations become overhead once those limitations no longer exist.
   *Source: lines 54-54*

**Assumptions:**
- Model capabilities improve meaningfully across releases.
- Configuration drift is harmful enough to warrant periodic review.

**Gaps:**
- Does not provide a methodology for evaluating which rules have become obsolete.

---

## Supporting Claims

### Claim: Agentic search is superior to RAG-based approaches for large, actively developed codebases.

**Evidence:**
1. [reasoning, strong] At large scale, those systems can fail because embedding pipelines can't keep up with active engineering teams.
   *Source: lines 8-9*
2. [example, strong] Retrieval then returns a function the team renamed two weeks ago, or references a module that was deleted in the last sprint.
   *Source: lines 9-9*
3. [reasoning, strong] Agentic search avoids those failure modes. There's no embedding pipeline or centralized index to maintain.
   *Source: lines 10-10*

**Assumptions:**
- Engineering velocity outpaces embedding pipeline refresh rates in large codebases.
- Live filesystem access is sufficiently fast for Claude's navigation patterns.

**Gaps:**
- Does not address the tradeoff of context window limits on agentic search breadth.

---

### Claim: A dedicated organizational owner is necessary to sustain adoption and prevent configuration fragmentation.

**Evidence:**
1. [example, strong] The rollouts that spread fastest had a dedicated infrastructure investment before broad access.
   *Source: lines 61-61*
2. [reasoning, moderate] Bottoms-up adoption generates enthusiasm but can fragment without someone to centralize what works.
   *Source: lines 65-65*
3. [reasoning, moderate] Without that work, knowledge will stay tribal and adoption will plateau.
   *Source: lines 65-65*

**Assumptions:**
- Configuration management is complex enough to require dedicated attention.
- Tribal knowledge patterns apply to AI tooling as they do to other engineering practices.

**Gaps:**
- Does not address the resource cost of a dedicated role for smaller organizations.

---

### Claim: LSP integration is one of the highest-value investments for making Claude Code work reliably in multi-language codebases.

**Evidence:**
1. [reasoning, strong] Without it, Claude pattern-matches on text and can land on the wrong symbol.
   *Source: lines 31-31*
2. [example, strong] One enterprise software company deployed LSP integrations org-wide before their Claude Code rollout, specifically to make C and C++ navigation reliable.
   *Source: lines 31-31*

**Assumptions:**
- Text-based grep is insufficient for symbol disambiguation in large codebases.
- LSP infrastructure is available and maintainable for the languages in use.

**Gaps:**
- Does not discuss the setup cost or languages where LSP support may be limited.

---
