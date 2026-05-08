<!-- gitnexus:start -->
# GitNexus (optional — off by default)

**Policy:** GitNexus is **optional** and is **currently disabled for agent use** in normal work. **Do not** invoke GitNexus MCP tools, read skills under `.claude/skills/gitnexus/`, or use `gitnexus://` MCP resources **unless the user clearly asks** you to use GitNexus for that task or session.

A local `.gitnexus/` directory may exist from past indexing; treat it as inactive context unless the user requests GitNexus.

**If the user explicitly asks for GitNexus:** read `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` first, then other skills there as needed. Run `npx gitnexus analyze` if tools report a stale index. For `gitnexus://repo/...` URIs, this tree is usually registered as **client**.

<!-- gitnexus:end -->