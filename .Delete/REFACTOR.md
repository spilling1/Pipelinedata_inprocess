# 📋 REFACTOR CHECKLIST - Sales Pipeline Analytics

## 🎯 REFACTOR OBJECTIVES
- [ ] Split oversized files (routes.ts: 2,121 lines → modular structure)
- [ ] Split oversized files (storage.ts: 2,064 lines → feature modules)
- [ ] Separate marketing from pipeline code completely
- [ ] Eliminate redundant code patterns
- [ ] Ensure complete timezone agnosticism
- [ ] Maintain all existing functionality

---

## ✅ STEP 1: Create Route Module Structure
**Goal**: Split massive routes.ts (2,121 lines) into logical modules

### Tasks:
- [ ] Create `server/routes/` directory structure
- [ ] Extract authentication routes to `server/routes/auth.ts` (~50 lines)
- [ ] Move upload functionality to `server/routes/upload.ts` (~400 lines)
- [ ] Extract analytics endpoints to `server/routes/analytics.ts` (~300 lines)
- [ ] Move database management to `server/routes/database.ts` (~150 lines)
- [ ] Create opportunities routes in `server/routes/opportunities.ts` (~200 lines)
- [ ] Update main `server/routes.ts` to register modules (~200 lines)
- [ ] Test all routes functionality
- [ ] Commit to git

**Expected Result**: routes.ts reduced from 2,121 to ~200 lines

---

## ✅ STEP 2: Separate Marketing Routes Completely
**Goal**: Remove all marketing code from pipeline routes

### Tasks:
- [ ] Remove marketing imports from main routes.ts
- [ ] Remove lines 2030+ from main routes.ts (marketing code)
- [ ] Consolidate `routes-mktg.ts` into `server/routes/marketing.ts`
- [ ] Create standalone marketing route registration
- [ ] Update imports and dependencies
- [ ] Test marketing functionality separation
- [ ] Test pipeline functionality isolation
- [ ] Commit to git

**Expected Result**: Complete separation of marketing and pipeline routing

---

## ✅ STEP 3: Split Storage Layer by Domain
**Goal**: Break down storage.ts (2,064 lines) into focused modules

### Tasks:
- [ ] Create `server/storage/` directory
- [ ] Extract opportunity CRUD to `server/storage/opportunities.ts` (~400 lines)
- [ ] Move analytics methods to `server/storage/analytics.ts` (~600 lines)
- [ ] Isolate snapshot operations in `server/storage/files.ts` (~200 lines)
- [ ] Create settings module `server/storage/settings.ts` (~150 lines)
- [ ] Create users module `server/storage/users.ts` (~150 lines)
- [ ] Create unified interface `server/storage/index.ts` (~50 lines)
- [ ] Update all imports across codebase
- [ ] Test all storage functionality
- [ ] Commit to git

**Expected Result**: Storage layer broken into manageable, focused modules

---

## ✅ STEP 4: Frontend Marketing Separation  
**Goal**: Separate marketing components from pipeline components

### Tasks:
- [ ] Move `client/src/pages/marketing-analytics.tsx` to `client/src/pages/marketing/`
- [ ] Verify marketing components are in `client/src/components/marketing/`
- [ ] Update routing imports for marketing pages
- [ ] Ensure no cross-dependencies between marketing/pipeline components
- [ ] Test marketing page functionality
- [ ] Test pipeline page functionality
- [ ] Commit to git

**Expected Result**: Clean separation of frontend concerns

---

## ✅ STEP 5: Extract Utility Functions
**Goal**: Eliminate redundant code patterns (DRY principle)

### Tasks:
- [ ] Create `shared/utils/fiscal.ts` - Fiscal year/quarter calculations
- [ ] Create `shared/utils/timezone.ts` - UTC date handling
- [ ] Create `client/src/hooks/useChartData.ts` - Common chart patterns
- [ ] Create `client/src/utils/formatting.ts` - Data formatting utilities
- [ ] Extract fiscal year calculations from multiple files
- [ ] Centralize timezone-agnostic date handling
- [ ] Replace redundant code with utility functions
- [ ] Update imports across codebase
- [ ] Test all affected functionality
- [ ] Commit to git

**Expected Result**: DRY principle implemented, redundancy eliminated

---

## ✅ STEP 6: Timezone Consistency
**Goal**: Ensure complete timezone agnosticism

### Tasks:
- [ ] Audit all date handling code
- [ ] Replace local timezone usage with UTC
- [ ] Standardize date formatting across components
- [ ] Remove any local timezone references
- [ ] Test date functionality across different timezones
- [ ] Verify fiscal year calculations are timezone-agnostic
- [ ] Commit to git

**Expected Result**: Completely timezone-agnostic application

---

## ✅ STEP 7: Final Cleanup & Documentation
**Goal**: Clean up any remaining issues and document changes

### Tasks:
- [ ] Remove unused imports
- [ ] Clean up temporary files
- [ ] Update AGENTS.md with refactor results
- [ ] Update INSTRUCTIONS.md with completed tasks
- [ ] Verify all functionality works
- [ ] Run final tests on all features
- [ ] Document any breaking changes
- [ ] Final git commit

**Expected Result**: Clean, maintainable codebase

---

## 🚨 CRITICAL CONSTRAINTS

### Never Touch:
- [ ] ✅ Replit authentication (`server/replitAuth.ts`)
- [ ] ✅ Database connection (`server/db.ts`)
- [ ] ✅ Vite configuration
- [ ] ✅ Session management

### File Size Limits:
- [ ] ✅ No file exceeds 800 lines
- [ ] ✅ Target: Most files under 500 lines
- [ ] ✅ Break up oversized files appropriately

### Testing Requirements:
- [ ] ✅ All existing features work exactly as before
- [ ] ✅ File upload/processing functions
- [ ] ✅ Analytics generation works
- [ ] ✅ Authentication works
- [ ] ✅ All routes respond correctly

---

## 📊 PROGRESS TRACKING

**Current Status**: Ready to begin  
**Completed Steps**: 0/7  
**Files Modified**: 0  
**Files Created**: 0  

### Git Commits Made:
- [ ] Step 1: Route module structure
- [ ] Step 2: Marketing separation
- [ ] Step 3: Storage layer split
- [ ] Step 4: Frontend separation
- [ ] Step 5: Utility extraction
- [ ] Step 6: Timezone consistency
- [ ] Step 7: Final cleanup

---

## 🎯 NEXT ACTION

**Ready to start Step 1**: Create Route Module Structure  
**Waiting for**: User approval to proceed

---

*Last updated: Ready to begin refactoring* 