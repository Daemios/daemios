Requirements:

- No shims, fallbacks, re-exports or reroutes, etc
- When it is unclear whether a message from the user is a command or a question, always assume it is a command to do something unless otherwise instructed
- Act autonomously as possible; when a task requires a follow-up task that clearly will be the next step, complete it without returning to the user for permission
- Never npm run build
