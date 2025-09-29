# GitHub Copilot Instructions

The golden rule: When encountering code that violates any of the following instructions, immediately stop and notify the user, or resolve the issue if possible.

## General Guidelines

- Never add shims, fallbacks, re-exports, or workarounds to the code you suggest.
- Your suggestions should be the best possible solution to the problem.
- Do not suggest code that has been deleted from the files.
- There should be a strong emphasis on readability, maintainability, and performance.
- When there is a mismatch between client, server, and database (Prisma schema), ask the user what they prefer to follow; do not create mappings between client, server, and database.
- Do not attempt to run the client or server Vite servers, or build.
- When you choose to communicate what you did and why, do so in a concise manner. Summarize with a single paragraph, and only add critical details beyond the summary paragraph.

## Client-Side Code Guidelines

- Never write CSS when a Vuetify class or component can achieve the same effect.
- When CSS is necessary, write it in-line via style bindings. Avoid Vue `<style>` blocks.
- Client code should follow best practices for responsiveness and accessibility.
- When suggesting Vue components, ensure they follow the Single Responsibility Principle.

## Server-Side Code Guidelines

- Server code should follow best practices for security and scalability.
- Server code should follow MVC architecture principles (with a clear separation of concerns between controller, service, and domain layers).
- Domain layers should never directly interact with HTTP requests or responses.
- Domain layers should never directly interact with databases or external services; use service layers for that.
