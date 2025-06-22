# AGENTS.md - AI Assistant Guidelines for Pipeline Analytics Codebase

## Project Overview

This is a **Sales Pipeline Analytics** application with comprehensive data processing, visualization, and reporting capabilities. The system handles Excel/CSV uploads for opportunity tracking and provides advanced analytics through multiple chart components.

## Critical Constraints

### 🚨 NEVER TOUCH THESE CORE SYSTEMS:
1. **Replit Authentication** (`server/replitAuth.ts`) - DO NOT MODIFY
2. **Vite Configuration** - Core Replit functionality
3. **Database Connection** (`server/db.ts`) - Neon PostgreSQL setup
4. **Session Management** - Using connect-pg-simple

## Current Architecture Issues

### Major Problems Requiring Refactoring:
1. **Oversized Files** (>500 lines): 
   - `server/routes.ts` (2121 lines) - MUST BE SPLIT
   - `server/storage.ts` (2064 lines) - NEEDS DECOMPOSITION
   - Several client components >500 lines

2. **Marketing/Pipeline Code Mixing**:
   - Marketing routes mixed in main routes.ts
   - Marketing storage separate but referenced from pipeline code
   - Frontend has mixed marketing/pipeline pages

3. **Redundant Code Patterns**:
   - Multiple storage implementations (storage.ts, storage-mktg.ts)
   - Duplicated fiscal year calculations
   - Repeated chart loading patterns

4. **Non-Timezone Agnostic Code**:
   - Some date handling may not be UTC-consistent
   - Local timezone references in various components

## File Size Guidelines

- **Maximum 500 lines per file** unless absolutely necessary
- Break large files into logical modules
- Prefer composition over large monolithic files

## Separation Requirements

### Marketing vs Pipeline:
- **Shared**: Database connection, authentication, shared schema
- **Separate**: All business logic, routes, UI components, storage methods
- **Marketing Files**: `*-mktg.ts`, `marketing/` directories
- **Pipeline Files**: Main analytics, opportunity tracking, pipeline visualization

## Key Files to Focus On

### Priority 1 (Must Refactor):
1. `server/routes.ts` - Split into modular route files
2. `server/storage.ts` - Break into feature-specific storage modules

### Priority 2 (Should Refactor):
1. Large client components (>500 lines)
2. Duplicated utility functions
3. Mixed marketing/pipeline frontend code

## Development Process

### Required Steps:
1. **Analysis Phase**: Deep dive into target files
2. **Plan Creation**: Detailed step-by-step refactor plan  
3. **User Approval**: MUST get confirmation before each step
4. **Small Changes**: Make minimal changes per commit
5. **Git Commits**: Push to git after each completed step
6. **Testing**: Ensure functionality preserved

### Step-by-Step Process:
- Present plan with smallest possible incremental changes
- Wait for user confirmation before proceeding
- Execute one change at a time
- Test functionality
- Commit to git
- Request permission for next step

## Code Quality Standards

### File Organization:
- Single responsibility per file
- Clear naming conventions
- Consistent import/export patterns
- Proper TypeScript typing

### Timezone Agnostic Requirements:
- All dates must use UTC
- No local timezone assumptions
- Consistent date formatting across components
- Use `Date.UTC()` for date creation

### Redundancy Elimination:
- Create shared utility functions
- Extract common patterns into reusable components
- Consolidate duplicate logic
- Use composition over repetition

## Technology Stack

### Core Technologies:
- **Backend**: Express.js + TypeScript, Drizzle ORM
- **Frontend**: React + TypeScript, Vite, TailwindCSS
- **Database**: PostgreSQL (Neon)
- **Charts**: Recharts library
- **File Processing**: XLSX parsing

### Architecture Patterns:
- RESTful API design
- Component-based frontend
- ORM-based data access
- Authentication middleware

## Success Criteria

### For Each Refactor Step:
1. **Functionality Preserved**: All existing features work exactly as before
2. **File Size Reduced**: Target files under 500 lines
3. **Code Clarity**: Improved readability and maintainability
4. **Separation Achieved**: Marketing and pipeline code properly isolated
5. **UTC Consistency**: All timezone dependencies removed
6. **Redundancy Reduced**: Duplicate code eliminated

## Testing Approach

### Before Each Change:
- Document current functionality
- Identify all dependencies
- Plan rollback strategy

### After Each Change:
- Verify core functionality
- Test file upload/processing
- Check analytics generation
- Confirm authentication works
- Validate all routes respond correctly

## Communication Protocol

### Required Confirmations:
- Present detailed plan before starting
- Get approval for each step
- Confirm before git commits
- Ask for permission to continue after each completed step

### Progress Reporting:
- Summarize what was accomplished
- Identify any issues encountered
- Preview next planned step
- Estimate time for next phase

This document should be referenced before any significant code changes and updated as the refactoring progresses. 