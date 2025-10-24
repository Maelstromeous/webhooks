# GitHub Copilot Instructions for Webhooks Repository

## Project Context

This is a webhook processor repository designed to handle webhooks for deployments and other automated tasks.

## Development Guidelines

### Code Quality
- Write clear, maintainable, and well-documented code
- Follow existing code patterns and conventions in the repository
- Keep changes minimal and focused on the specific task at hand

### Testing
- Add tests for new functionality where test infrastructure exists
- Ensure all tests pass before finalizing changes
- Do not remove or modify existing tests unless necessary for the task

### Documentation
- Update documentation when making changes that affect usage or behavior
- Keep README.md and other docs in sync with code changes
- Use clear and concise language in all documentation

## Working with Issues

### Good Tasks for Copilot
- Bug fixes with clear reproduction steps
- Adding new webhook handlers or processors
- Documentation updates and improvements
- Test coverage improvements
- Code refactoring and cleanup
- Dependency updates

### Tasks Requiring Human Review
- Security-sensitive changes
- Major architectural decisions
- Complex business logic changes
- Production-critical deployments

## Code Review Standards
- All changes must be reviewed before merging
- Security vulnerabilities must be addressed
- Code should follow repository patterns and conventions
- Changes should be minimal and surgical

## Git Workflow
- Create focused commits with clear messages
- Keep pull requests small and reviewable
- Branch names should follow the pattern: `copilot/<descriptive-name>`
- Always review changes before committing

## Best Practices
- Run linters and tests frequently during development
- Validate changes manually when possible
- Use existing tooling and libraries where available
- Prefer ecosystem tools over manual changes
- Make incremental changes and test iteratively
