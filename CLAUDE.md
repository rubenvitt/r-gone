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