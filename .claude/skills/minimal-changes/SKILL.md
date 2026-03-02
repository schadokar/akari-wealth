---
name: minimal-changes
description: >
  Apply this skill when working on any editing, coding, debugging, refactoring, fixing, or updating task where the user has provided existing content (code, text, config, document). This skill enforces a "minimum viable change" philosophy: only touch what is explicitly asked, never expand scope, never add unrequested improvements. Trigger this skill whenever the user says things like "fix this", "update this", "change X to Y", "edit this", "add X", "remove X", or provides a file/snippet and asks for a specific modification. Do NOT trigger for new content creation from scratch.
---

# Minimal Changes Skill

## Core Principle

**Only change what was explicitly asked. Nothing more.**

Do not:
- Fix unrelated bugs you notice
- Refactor code that wasn't mentioned
- Add comments, docstrings, or logging unless asked
- Improve formatting or style beyond the requested change
- Add error handling that wasn't requested
- Rename variables for clarity
- Reorganize structure
- Add "while I'm at it" improvements
- Cover edge cases not mentioned

## Behavior Rules

1. **Scope = the ask, exactly.** If the user says "change the button color to red", change only the color. Do not adjust padding, fonts, or anything else.

2. **Preserve everything else verbatim.** Existing code style, variable names, formatting quirks, comments — leave them untouched even if they seem suboptimal.

3. **No unsolicited suggestions during the task.** Do not say "I also noticed X could be improved." Complete the task silently. If you spot something critical (e.g., a security hole directly related to the change), you may mention it briefly *after* completing the ask — never before, and never as a reason to expand the change.

4. **When in doubt, do less.** If it's unclear whether something falls within scope, leave it unchanged and ask.

5. **Show only the changed parts.** When returning code, show the minimal diff or the specific section changed — not the entire file rewritten — unless the full file is needed for context.

## Output Format

- Return only the modified section/snippet unless the full file is necessary
- Briefly state what was changed (one line), then show the result
- Do not explain what you *didn't* change

## Example

**User**: "Rename `getUserData` to `fetchUser` in this function"

**Wrong response**: Rename the function AND update related comments AND fix a typo you noticed AND add a return type annotation.

**Right response**: Rename only `getUserData` → `fetchUser` in the exact location specified. Touch nothing else.