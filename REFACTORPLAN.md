I'll analyze the entire codebase to create a comprehensive refactor plan. Let me start by examining the project structure and key files.
Read file: AGENTS.md
Ran tool
Read file: server/routes.ts
Read file: server/storage.ts
Let me continue examining the codebase structure and key files:
Ran tool
Ran tool
Read file: server/routes.ts
Ran tool
Let me continue examining the structure and file sizes:
Ran tool
Ran tool
Read file: package.json
Ran tool
Now let me create AGENTS.md and examine some more critical files:
Read file: shared/schema.ts
Read file: instructions.md
Ran tool
Based on my comprehensive analysis of the codebase, I'll now create AGENTS.md and provide you with a detailed refactor plan. Let me create the required documentation first:
Ran tool
I'll create the refactor plan now. Based on my comprehensive analysis, here is your detailed refactor plan:

# 📋 COMPREHENSIVE REFACTOR PLAN - Sales Pipeline Analytics

## 🎯 ANALYSIS SUMMARY

### Current Issues Identified:

1. **Oversized Files** (Critical):
   - `server/routes.ts`: 2,121 lines (should be ~200-300 per module)
   - `server/storage.ts`: 2,064 lines (should be ~300-400 per module)

2. **Marketing/Pipeline Code Mixing** (High Priority):
   - Marketing routes embedded in main `routes.ts` (lines 2030+)
   - Marketing components in same directory structure
   - Shared database but mixed business logic

3. **Redundant Code Patterns** (Medium Priority):
   - Multiple storage files (`storage.ts`, `storage-mktg.ts`)
   - Duplicated fiscal calculations
   - Repeated chart loading patterns

4. **Timezone Issues** (Low Priority):
   - Some timezone-agnostic code exists, needs consistency

## 🚀 REFACTOR PLAN - STEP-BY-STEP

### 📌 STEP 1: Create Route Module Structure
**Goal**: Split the massive 2,121-line `routes.ts` into logical modules
**Files to create**: 
- `server/routes/auth.ts` (~50 lines)
- `server/routes/upload.ts` (~400 lines) 
- `server/routes/analytics.ts` (~300 lines)
- `server/routes/database.ts` (~150 lines)
- `server/routes/opportunities.ts` (~200 lines)

**Changes**:
1. Create `server/routes/` directory structure
2. Extract authentication routes to `auth.ts`
3. Move upload functionality to `upload.ts`
4. Extract analytics endpoints to `analytics.ts`
5. Move database management to `database.ts`
6. Create main route registration function

**Expected Result**: `routes.ts` reduced from 2,121 to ~200 lines

---

### 📌 STEP 2: Separate Marketing Routes Completely
**Goal**: Remove all marketing code from pipeline routes
**Files to modify/create**:
- Remove marketing imports from main `routes.ts`
- Consolidate marketing routes in `server/routes/marketing.ts`
- Update marketing route registration

**Changes**:
1. Remove lines 2030+ from main `routes.ts` (marketing code)
2. Consolidate `routes-mktg.ts` and marketing sections 
3. Create standalone marketing route registration
4. Update imports and dependencies

**Expected Result**: Complete separation of marketing and pipeline routing

---

### 📌 STEP 3: Split Storage Layer by Domain
**Goal**: Break down the 2,064-line `storage.ts` into focused modules
**Files to create**:
- `server/storage/opportunities.ts` (~400 lines)
- `server/storage/analytics.ts` (~600 lines)
- `server/storage/snapshots.ts` (~300 lines)
- `server/storage/files.ts` (~200 lines)
- `server/storage/settings.ts` (~150 lines)
- `server/storage/index.ts` (~50 lines - main interface)

**Changes**:
1. Extract opportunity CRUD operations
2. Move analytics methods to separate module
3. Isolate snapshot operations
4. Separate file management methods
5. Create unified storage interface

**Expected Result**: Storage layer broken into manageable, focused modules

---

### 📌 STEP 4: Frontend Marketing Separation
**Goal**: Separate marketing components from pipeline components
**Changes**:
1. Move `client/src/pages/marketing-analytics.tsx` to `client/src/pages/marketing/`
2. Move marketing components to `client/src/components/marketing/`
3. Update routing and imports
4. Ensure no cross-dependencies

**Expected Result**: Clean separation of frontend concerns

---

### 📌 STEP 5: Extract Utility Functions
**Goal**: Eliminate redundant code patterns
**Files to create**:
- `shared/utils/fiscal.ts` - Fiscal year/quarter calculations
- `shared/utils/timezone.ts` - UTC date handling
- `client/src/hooks/useChartData.ts` - Common chart patterns
- `client/src/utils/formatting.ts` - Data formatting utilities

**Changes**:
1. Extract fiscal year calculations from multiple files
2. Centralize timezone-agnostic date handling
3. Create reusable chart data hooks
4. Consolidate formatting functions

**Expected Result**: DRY principle implemented, redundancy eliminated

---

### 📌 STEP 6: Timezone Consistency
**Goal**: Ensure complete timezone agnosticism
**Changes**:
1. Audit all date handling code
2. Ensure UTC usage throughout
3. Remove any local timezone references
4. Standardize date formatting

**Expected Result**: Completely timezone-agnostic application

---

### 📌 STEP 7: Final Cleanup & Documentation
**Goal**: Clean up any remaining issues and document changes
**Changes**:
1. Remove any unused imports
2. Update documentation
3. Verify all functionality works
4. Clean up any temporary files

**Expected Result**: Clean, maintainable codebase

---

## ⚠️ IMPORTANT CONSTRAINTS

1. **File Size Limit**: No file should exceed 500 lines
2. **Replit Core**: Never touch authentication, database connection, or vite config
3. **Incremental Changes**: Each step must be approved before proceeding
4. **Git Commits**: Push to git after each completed step
5. **Functionality Preservation**: All existing features must continue working exactly as before

## 🔍 ESTIMATED IMPACT

- **Total Files to Modify**: ~15-20 files
- **New Files to Create**: ~12-15 files
- **Code Reduction**: From 4,000+ lines in 2 files to distributed, manageable modules
- **Maintainability**: Dramatically improved
- **Separation**: Complete isolation of marketing and pipeline concerns

---

## 🎯 READY TO START?

I'm ready to begin with **STEP 1: Create Route Module Structure**. This will be the smallest possible change - just creating the directory structure and extracting the authentication routes.

**Would you like me to proceed with Step 1, or would you like me to modify any part of this plan first?**

After your approval, I'll:
1. Create the `server/routes/` directory
2. Extract authentication routes to `auth.ts` 
3. Update the main `routes.ts` to use the new auth module
4. Test functionality
5. Commit to git
6. Request permission for Step 2