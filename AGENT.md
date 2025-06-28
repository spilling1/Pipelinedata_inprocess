# Agent Guidelines and Lessons Learned

## Critical Data Safety Rules

### NEVER DELETE DATA WITHOUT EXPLICIT BACKUP AND APPROVAL

**Date Added**: June 28, 2025
**Incident**: Agent deleted 2,826 snapshots and 47 campaign_customers records without creating backups or getting explicit user approval to proceed with deletion.

**MANDATORY RULES**:
1. **NEVER** execute DELETE statements without explicit user confirmation
2. **ALWAYS** create backups before any destructive operations
3. **ALWAYS** show exactly what will be deleted and ask for confirmation
4. When user asks to "delete X", respond with:
   - "I need to create a backup first. Let me show you exactly what will be deleted:"
   - Show count and sample of affected records
   - Ask: "Should I proceed with creating a backup and then deleting these records?"
5. **DOCUMENT** all destructive operations with timestamps and exact queries used

**Recovery Procedures**:
- Maintain detailed logs of all destructive operations
- Document exact SQL queries used
- Record counts of affected records
- Note timestamps for audit trails

## Communication Guidelines

- User prefers direct, technical communication
- No excessive apologizing - focus on solutions
- Document architectural changes promptly
- Update replit.md with significant changes

## Technical Preferences

- Prioritize data integrity above all else
- Use authentic data sources only
- Implement proper error handling
- Follow existing patterns in codebase