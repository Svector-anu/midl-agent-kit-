# UI Auto-Activation

Defines automatic skill triggers for any MIDL dApp frontend. Copy or symlink this skill into a dApp's `.claude/skills/` to activate.

---

## Boot Sequence

1. Read `<REPO_ROOT>/capabilities.json` — confirm `features.uiSkills === true`
2. Read `<REPO_ROOT>/MIDDLEWARE.md`
3. If `features.uiSkills !== true` → call `pauseIfUnsupported("uiSkills")` and STOP

---

## Trigger Map

Fire the listed skill automatically based on what is being edited. Do not wait to be asked.

| Trigger | Skill | Timing |
|---------|-------|--------|
| Edit `src/**/*.css` or `src/**/*.scss` | `baseline-ui` | After edit |
| Edit `src/**/*.tsx` or `src/**/*.jsx` with className, layout, or visual changes | `baseline-ui` | After edit |
| Add or change `animation`, `transition`, `@keyframes`, `motion` in any file | `fixing-motion-performance` | Before finalising |
| Edit `index.html` head, `<meta>`, `<title>`, OG/Twitter tags | `fixing-metadata` | After edit |
| Add or modify `aria-*`, `role=`, `tabIndex`, focus, keyboard handlers | `fixing-accessibility` | After edit |

---

## Iteration Cap

- Max **3** auto-polish loops per milestone (`capabilities.gates.maxAutoPolishIterations`)
- After 3 loops without resolution → surface remaining violations to user, do not auto-fix
- If a violation conflicts with an intentional design decision → ask before fixing

---

## Output Format

After each auto-activation, output a compact inline summary:

```
AUTO: baseline-ui → src/styles.css
✓ No violations
```

or:

```
AUTO: baseline-ui → src/components/PostCard.tsx
⚠ 2 violations:
  - animated background-color (line 12) → use opacity/transform
  - min-height: 100vh (line 3) → use 100dvh
Fixing...
```

---

## Brand Lock (always active — no skill invocation needed)

These constraints apply to every dApp in this agent kit regardless of skill activation:

| Constraint | Rule |
|------------|------|
| Primary accent | `#F7931A` (Bitcoin orange) — one accent per view |
| Backgrounds | `#0a0a0a` / `#161616` — no other ad-hoc darks |
| All color values | CSS custom properties in `:root` only — no hardcoded hex in components |
| Gradients | Never, unless explicitly requested |
| Glow effects | Never as primary affordance |
| Font | System mono (`ui-monospace`) for labels/addresses; system sans for body |

---

## Installing into a new dApp

```bash
# From the dApp directory
npx skills add ibelick/ui-skills --scope project --yes
```

Then reference this SKILL.md in the dApp's `CLAUDE.md`:

```markdown
## Auto-Activation
See: <REPO_ROOT>/skills/ui-auto-activation/SKILL.md
```

---

## Required skills (must be installed)

From `ibelick/ui-skills`:
- `baseline-ui`
- `fixing-motion-performance`
- `fixing-metadata`
- `fixing-accessibility`
