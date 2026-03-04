---
name: project-map
description: >
  Use when the user says "/project-map", "show project structure", "show me the tree", "map the project", or when the agent needs to understand the directory layout before starting a task. Generates a directory tree excluding heavy/irrelevant folders (node_modules, vendor, .git, dist, bin) to quickly orient on file positions.
user_invocable: true
---

# Project Map Skill

## Purpose

Generate a concise directory tree of the current project so the AI agent (and user) can quickly understand file locations without expensive exploration. This saves context and avoids unnecessary glob/grep calls at the start of a task.

## Behavior

1. Run the tree command to produce the project structure:

```
tree -I 'node_modules|vendor|bin|.git|dist|.claude' -L 4
```

2. Present the output to the user as-is.

3. Note the total file/directory count from the tree summary line.

4. Do NOT attempt to read, modify, or analyze any files — only display the tree.

## When to Use

- At the start of a new conversation when the project layout is unknown
- When the user asks about file locations or project structure
- Before planning a multi-file change, to confirm paths exist

## Notes

- The `-L 4` depth is a default. If the user asks for more or less depth, adjust accordingly.
- If `tree` is not installed, fall back to: `find . -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/vendor/*' -not -path '*/dist/*' -not -path '*/bin/*' | head -120 | sort`
