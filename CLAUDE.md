# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application called "If I'm Gone" - a secure information management system that encrypts sensitive data for emergency access. The app uses dual encryption strategies: OpenPGP for manual CLI encryption/decryption and Node.js crypto for programmatic RSA encryption.

## Development Commands

```bash
# Development server with Turbopack
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint codebase
pnpm lint
```

## IDE Integration (JetBrains MCP)

This project includes JetBrains MCP server integration, enabling direct communication with your IDE for enhanced development workflows.

### Key Capabilities

**File Operations:**
- `mcp__jetbrains__get_open_in_editor_file_text` - Read currently open file
- `mcp__jetbrains__replace_current_file_text` - Replace entire file content
- `mcp__jetbrains__replace_specific_text` - Make targeted text replacements
- `mcp__jetbrains__create_new_file_with_text` - Create new files in project

**Code Navigation:**
- `mcp__jetbrains__find_files_by_name_substring` - Search files by name
- `mcp__jetbrains__search_in_files_content` - Search content across project
- `mcp__jetbrains__list_files_in_folder` - Explore directory structure
- `mcp__jetbrains__get_file_text_by_path` - Read specific files

**Development Tools:**
- `mcp__jetbrains__get_current_file_errors` - Check for errors in current file
- `mcp__jetbrains__get_project_problems` - View all project issues
- `mcp__jetbrains__reformat_file` - Apply code formatting
- `mcp__jetbrains__toggle_debugger_breakpoint` - Manage breakpoints

**Terminal & VCS:**
- `mcp__jetbrains__execute_terminal_command` - Run terminal commands
- `mcp__jetbrains__get_terminal_text` - Read terminal output
- `mcp__jetbrains__get_project_vcs_status` - Check Git status

### Usage Examples

```typescript
// Example: Refactoring with IDE integration
// 1. Find all files containing a pattern
mcp__jetbrains__search_in_files_content({ searchText: "oldFunctionName" })

// 2. Make targeted replacements
mcp__jetbrains__replace_specific_text({
  pathInProject: "services/file-service.ts",
  oldText: "oldFunctionName",
  newText: "newFunctionName"
})

// 3. Check for errors after changes
mcp__jetbrains__get_project_problems()
```

This integration provides seamless development experience by working directly within your IDE environment.

## Encryption Architecture

The application implements two distinct encryption approaches:

### 1. CLI/Manual Encryption (GPG)
- **Files:** `gone.json` (plaintext) ↔ `gone.json.gpg` (encrypted)
- **Library:** System GPG via command line
- **Usage:** Manual encryption/decryption for data at rest
- **Commands:**
  - Decrypt: `gpg --pinentry-mode loopback --decrypt gone.json.gpg`
  - Encrypt: `gpg --symmetric --pinentry-mode loopback gone.json`

### 2. Programmatic Encryption (OpenPGP/RSA)
- **OpenPGP:** `lib/pgp.ts` - Password-based symmetric encryption using openpgp library
- **RSA:** `utils/crypto.ts` - Public/private key encryption using Node.js crypto
- **File Service:** `services/file-service.ts` - Handles encrypted file storage in `/data` directory

## Data Structure

Data follows a structured schema defined in `gone.schema.json`:
- **Sections:** Array of objects with `id`, `title`, and `content` fields
- **Types:** Defined in `types/data.ts` with interfaces for `Section`, `EncryptedDataFile`, and `DecryptedData`
- **Storage:** Encrypted files saved as `{userId}.encrypted` in data directory

## UI Framework

- **Component Library:** shadcn/ui with New York style
- **Styling:** Tailwind CSS with CSS variables
- **Icons:** Lucide React
- **Path Aliases:** Configured for `@/components`, `@/lib`, `@/utils`, etc.
- **Layout:** App Router with Header/Footer wrapper structure

## Key Considerations

- Dual encryption systems serve different purposes - don't mix them
- File service assumes `/data` directory for encrypted storage
- TypeScript strict mode enabled
- Component paths follow shadcn/ui conventions