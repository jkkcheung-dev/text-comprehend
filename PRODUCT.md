# Product

## Register

product

## Users

Developers and knowledge workers using the Text Comprehend plugin inside OpenCode (AI coding agent). They want to deeply understand text documents — articles, papers, documentation — by exploring an interactive mind-map of extracted concepts, arguments, and comprehension questions. They open the dashboard after running `/comprehend` on their working directory.

## Product Purpose

Text Comprehend transforms text documents into interactive knowledge graphs. It runs a multi-agent pipeline (summarizer, concept extractor, argument mapper, QA generator) over text files and presents the results as a browsable, searchable, filterable mind-map in a browser dashboard. The dashboard is the exploration layer — the user discovers connections, tests their understanding, and drills into details.

## Brand Personality

**Dark, sharp, precise.** Three words: *focused, technical, exploratory.* The dashboard feels like a developer tool — calm, high-contrast, monospace-accented. It says "we respect your attention and your intelligence." Reference aesthetic: GitHub Dark, Linear, VS Code.

## Anti-references

- **Corporate SaaS dashboards** — white backgrounds, navy accents, generic data-table grids
- **Reinvented affordances** — custom scrollbars, non-standard form controls, novel navigation patterns
- **Heavy color accents everywhere** — saturated colors on inactive elements, decorative use of bright hues
- **Gratuitous motion** — bounce animations, orchestrated page-load sequences, decorative transitions

## Design Principles

1. **The graph is the product.** Everything serves the knowledge graph exploration experience.
2. **Darkness creates focus.** A zinc-on-zinc palette reduces visual noise so nodes and edges pop.
3. **Show, don't decorate.** Every color, border, and animation has functional meaning — facet identification, selection state, search matching, content reveal.
4. **Earned familiarity.** Use established patterns (tab bar, checkbox toggles, keyboard nav) so the tool disappears into the task.

## Accessibility & Inclusion

- WCAG 2.1 AA compliance
- Semantic HTML: proper heading hierarchy, ARIA tab panel patterns, keyboard-navigable graph
- Color is never the only indicator — text labels accompany every colored element
- `prefers-reduced-motion` respected for all animations and transitions
- Reasonable contrast ratios: all text ≥ 4.5:1 against backgrounds
