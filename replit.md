# Pipeline Opportunity Tracker - System Overview

## Overview

The Pipeline Opportunity Tracker is a comprehensive sales pipeline analytics application built to analyze, visualize, and track opportunity data over time through Excel file uploads. The system provides advanced analytics, predictive modeling, and comprehensive reporting tools for sales teams to transform their data into actionable insights.

## System Architecture

### Technology Stack
- **Frontend**: React + TypeScript with Vite build system
- **UI Framework**: shadcn/ui components with TailwindCSS styling
- **Backend**: Express.js + TypeScript server
- **Database**: PostgreSQL via Neon cloud database
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth integration (pre-configured)
- **Charts**: Recharts library for data visualization
- **File Processing**: XLSX library for Excel parsing

### Project Structure
```
├── client/src/           # React frontend application
│   ├── components/       # UI components (15+ chart/analytics components)
│   ├── pages/           # Main application pages
│   ├── types/           # TypeScript type definitions
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utility libraries
├── server/              # Express backend
│   ├── storage*.ts      # Data access layer (multiple files)
│   ├── routes.ts        # API endpoints (large file)
│   └── replitAuth.ts    # Authentication (do not modify)
├── shared/              # Common types and schema
└── configuration files
```

## Key Components

### 1. Data Ingestion & Processing
- **Excel File Upload**: Supports .xlsx format with automatic date extraction from filenames
- **Smart Header Detection**: Automatically identifies header rows in Excel files
- **Column Mapping**: Flexible mapping of Excel columns to database fields
- **Data Normalization**: Stage name mapping and data cleaning
- **Pivot Table Support**: Handles Excel pivot table formats

### 2. Core Data Entities
- **Opportunities**: Core deal records with metadata (opportunities table)
- **Snapshots**: Point-in-time data captures for trend analysis (snapshots table)
- **Stage Mappings**: Configurable normalization rules
- **Uploaded Files**: File tracking and metadata (uploadedFiles table)
- **Users**: User management for Replit Auth (users table)
- **Sessions**: Session storage for authentication (sessions table)

### 3. Analytics Engine
- **Pipeline Metrics**: Total value, active count, average deal size, conversion rates
- **Stage Distribution**: Count and value breakdown by sales stage
- **Fiscal Period Analysis**: Year, quarter, and monthly pipeline tracking
- **Deal Movement Tracking**: Stage transitions and timeline analysis
- **Win/Loss Analytics**: Success rates and loss reason analysis
- **Predictive Insights**: Closing probability and date slippage analysis

### 4. Visualization Components
- Pipeline value charts with time series data
- Stage distribution pie charts
- Sankey flow diagrams for deal movement
- Funnel charts for stage progression
- Heatmaps for loss reason analysis
- Metrics cards with KPI summaries

## Data Flow

1. **File Upload**: Users upload Excel files containing opportunity data
2. **Data Extraction**: System parses Excel files and extracts snapshot dates from filenames
3. **Data Processing**: Opportunities and snapshots are created/updated in the database
4. **Analytics Calculation**: Real-time analytics are computed from stored data
5. **Visualization**: Charts and metrics are rendered based on filtered data
6. **User Interaction**: Filters and date ranges allow for dynamic data exploration

## External Dependencies

### Database
- **Neon PostgreSQL**: Cloud-hosted PostgreSQL database
- **Connection**: Uses connection pooling via @neondatabase/serverless
- **Migrations**: Managed through Drizzle Kit

### Authentication
- **Replit Auth**: Pre-configured OpenID Connect authentication
- **Session Management**: PostgreSQL-backed session storage
- **User Management**: Automatic user creation and management

### File Processing
- **XLSX**: Excel file parsing and data extraction
- **Multer**: File upload handling with memory storage
- **Date Parsing**: Automatic date extraction from filenames

### UI Libraries
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-styled component library
- **TailwindCSS**: Utility-first CSS framework
- **Recharts**: Chart and visualization library

## Deployment Strategy

### Development
- **Environment**: Replit development environment
- **Hot Reload**: Vite HMR for frontend, tsx for backend
- **Database**: Neon development database
- **Port**: Application runs on port 5000

### Production
- **Build Process**: Vite build for frontend, esbuild for backend
- **Deployment Target**: Replit autoscale deployment
- **Static Assets**: Served from dist/public directory
- **Environment Variables**: Database credentials via .env file

### Configuration
- **Modules**: nodejs-20, web, postgresql-16
- **Build Command**: npm run build
- **Start Command**: npm run start
- **Development**: npm run dev

## Changelog
- June 14, 2025. Initial setup
- June 18, 2025. Added Marketing Analytics module with campaign management, ROI tracking, and performance insights

## Recent Changes

✓ Storage Layer Refactoring Complete (June 27, 2025)
- Successfully refactored monolithic storage.ts (2,762 lines) into modular, specialized storage classes
- Extracted User Management Storage (#1): authStorage with user operations and authentication
- Extracted Settings/Configuration Storage (#2): settingsStorage with stage mappings and configurations
- Extracted Basic CRUD Operations (#3): opportunitiesStorage, snapshotsStorage, and filesStorage
- Extracted Sales Analytics Adapter Layer (#4): salesStorage with 17+ sales-specific analytics methods
- Maintained backward compatibility using composition pattern with storage properties
- Updated all route method calls to use new storage properties (storage.salesStorage.getSalesRepsList, etc.)
- Reduced main storage.ts from 2,762 to 2,157 lines (605 lines total reduction)
- All type checking errors resolved and application functionality verified
- Follows risk-assessed approach prioritizing lowest risk, highest reward extractions

✓ Dedicated Marketing Storage Architecture (June 18, 2025)
- Created separate storage-mktg.ts file for all marketing functionality 
- Migrated all marketing routes to use dedicated marketingStorage instance
- Enhanced campaign analytics with current vs starting metrics comparison
- Implemented proper separation between current snapshot data and campaign baseline values
- Added comprehensive error handling and logging for marketing operations

✓ Enhanced Campaign Metrics System (June 18, 2025)
- Closed Won: Shows current snapshot Year 1 ARR sum and customer count for non-initially-closed customers
- Opportunities: Current open count vs starting campaign customer count
- Pipeline Value: Current open opportunity ARR vs starting campaign ARR baseline
- Win Rate: Current win percentage vs close rate (closed won / total starting customers)
- CAC: Budget divided by current closed won customer count
- All metrics exclude customers already "Closed Won" at campaign start for accurate attribution

✓ Marketing Analytics Feature Complete
- Added campaigns and campaign_customers database tables
- Implemented complete CRUD operations for campaign management
- Created customer-to-campaign association with snapshot data capture
- Built comprehensive analytics: CAC, win rates, pipeline value by campaign type
- Added campaign comparison tools and performance insights
- Integrated charts and visualizations for campaign effectiveness
- Added navigation from home page to new Marketing Analytics section

✓ Customer Addition Functionality Fixed (June 18, 2025)
- Resolved customer display issue where added customers weren't appearing
- Fixed snapshot data population during customer addition process
- Enhanced backend debugging and error handling for troubleshooting
- Updated customer display to show both Year1 ARR and TCV values
- Verified database integrity with proper stage and financial data storage
- Customers now properly appear in campaign customer lists after addition

✓ Customer List Display Improvements (June 18, 2025)
- Implemented vertical kebab menu (changed from horizontal three-dot to vertical)
- Added tabbed interface for campaign details (Analytics and Customers tabs)
- Enhanced customer list readability with single-line format: "Customer • Stage • $Year1ARR"
- Sorted customers by name in descending order
- Reduced row spacing for better density
- Updated both dropdown selection and table display for consistency

✓ Snapshot Date Selection System (June 18, 2025)
- Added date picker to customer addition form for historical snapshot selection
- Backend queries snapshots from specified date or closest available date
- System handles null financial values from zero-dollar snapshots without crashing
- Customer display shows actual snapshot dates, not campaign addition dates
- Historical data integrity maintained with authentic snapshot values

✓ Enhanced Customer Addition with Warnings & Auto-refresh (June 18, 2025)
- Auto-refresh customer lists immediately after adding customers
- Warning dialog when snapshot date differs from requested date with user confirmation
- Close date display in customer details preview
- Preview endpoint validates snapshot availability before commitment
- Comprehensive error handling for missing snapshot data

✓ Analytics System Rewrite Complete (June 18, 2025)
- Completely rewrote analytics endpoint to fix persistent routing conflicts
- Created direct analytics route `/api/marketing/campaigns/:id/analytics` registered before marketing router
- Fixed frontend query to use correct endpoint with campaign ID parameter
- Updated performance metrics display to show current vs starting values correctly
- All five metrics cards (Closed Won, Opportunities, Pipeline Value, Win Rate, CAC) now display authentic data
- System successfully shows: $1.5M closed won (2 customers), 1 current vs 3 starting opportunities, etc.

✓ UI Improvements and Data Clarity (June 18, 2025)
- Changed "Pipeline Value" to "Remaining Pipeline" for clearer terminology
- Enhanced customer display format with "Starting Value:" and "Current Values:" labels
- Added prominent note that pre-existing "Closed Won" customers are excluded from analytics
- Improved data transparency and user understanding of campaign attribution logic

✓ Current Snapshot Data Implementation (June 18, 2025)
- Created `/api/marketing/campaigns/:id/current-snapshots` endpoint for real-time data
- Implemented `getCurrentSnapshotsForCampaign` method in marketing storage
- Updated frontend to fetch and display actual current snapshot values vs starting values
- Current Values now show live data from latest database snapshots
- Starting Values show data captured when customer was added to campaign

✓ Enhanced Customer Exclusion Indicators (June 18, 2025)
- Added "Customer not used in the analytics" message for pre-existing "Closed Won" customers
- Visually distinguished excluded customers with orange italic text
- Maintained clear separation between analytics-included and excluded customers
- Improved user understanding of which customers contribute to campaign metrics

✓ Enhanced Pipeline Data Integration (June 18, 2025)
- Added "entered pipeline" field tracking and display from existing database schema
- Implemented pipeline entry filtering with "Has Pipeline Entry" and "No Pipeline Entry" options
- Updated analytics calculations to only count customers with populated "entered pipeline" field
- Visual indicators show pipeline entry dates with blue badges for clarity
- Campaign metrics now accurately reflect only customers who have genuinely entered the pipeline
- Updated note to clarify: "Only customers with 'entered pipeline' field populated count toward pipeline analytics"

✓ Updated Win Rate and Close Rate Calculations (June 18, 2025)
- Win Rate: Closed Won (not pre-existing) / (Closed Won + Closed Lost with pipeline entry)
- Close Rate: Closed Won (not pre-existing) / (Closed Won + All pipeline customers not Closed Won)
- Both rates exclude customers who were already "Closed Won" when added to campaign
- Calculations ensure accurate attribution by only counting pipeline-engaged customers

✓ Added Customer Analytics Lists on Analytics Page (June 18, 2025)
- New Closed Won Customers: Shows customers who are "Closed Won" and were NOT already "Closed Won" when added to campaign
- Active Pipeline Customers: Shows customers with pipeline entry who are not Closed Won/Lost and were not pre-existing Closed Won
- Both lists display customer name, stage, Year 1 ARR, and pipeline entry date
- Green styling for closed won customers, blue styling for active pipeline customers
- Created dedicated API endpoints: /closed-won-customers and /pipeline-customers

✓ Pipeline Walk Chart Enhancement Complete (June 19, 2025)
- Added time-based Pipeline Walk chart showing pipeline value progression from campaign start to today
- Chart uses weekly intervals for smooth visualization with stacked area format (Pipeline blue, Closed Won green)
- Implemented logic to only include snapshots after customer's "entered pipeline" date for accurate timeline
- Chart positioned above customer lists in Analytics tab for better workflow
- Updated chart subtitle to include campaign name: "Pipeline value from campaign start to today for: [campaign]"
- Removed "Total Change" percentage display for cleaner presentation
- Enhanced metrics labels: "Opportunities" → "Open Pipeline", "Remaining Pipeline" → "Current Pipeline Value"
- Changed "Started" to "Total" for both Open Pipeline and Current Pipeline Value metrics

✓ Enhanced New Deals Creation Card (June 19, 2025)
- Transformed Stage Movements card into focused New Deals Creation analytics
- Added comprehensive metrics: Total Deals, Closed Won value, Pipeline value (excluding Closed Won/Lost)
- Implemented collapsible grouping by current stage with predefined order
- Enhanced table display with Starting Stage, Current Stage, Year 1 ARR, and Date Created columns
- Removed stage movement transitions to focus purely on deal creation metrics
- All calculations dynamically update based on timeframe selection (30, 60, 90 days, all time)
- Metrics filtered to only include customers shown in the card for accurate attribution

✓ Marketing analytics system fully operational with authentic pipeline data filtering, real-time current data display, comprehensive campaign attribution logic, dynamic pipeline progression visualization, enhanced new deals creation tracking, and pipeline performance breakdown by opportunity owner

✓ Performance Optimization and React Warnings Fixed (June 27, 2025)
- Eliminated unnecessary file polling that was checking every 5 seconds
- Reduced API calls from 720 per hour to only when needed
- Changed to refresh on window focus instead of constant polling
- Fixed React key warnings in WinRateCard and CloseRateCard by correcting property name mismatch
- Updated SelectItem components to use correct `id` property from dateRangeOptions array instead of undefined `value`
- Added memoization optimizations: currency formatter, query parameters, and stage color mapping
- Implemented debounced search input (300ms delay) to prevent excessive API calls during typing
- Optimized React rendering performance with proper memoization in OpportunitiesTable component
- Fixed missing dependency arrays in useEffect hooks (Settings page) using useCallback to prevent stale closures
- Implemented comprehensive chart component memoization for performance optimization:
  * PipelineValueChart: Memoized data processing, tooltip formatting, and custom ticks calculation
  * StageDistributionChart: Memoized stage ordering, data transformation, and tooltip functions
  * WinRateCard & CloseRateCard: Memoized color calculations and styling logic
  * FiscalYearPipelineChart: Memoized time-based data processing and transformations
- Fixed React hooks ordering errors to ensure proper component rendering and stability
- Improved application performance and reduced server load
- Files now refresh when returning to browser tab or during actual uploads

✓ Sales Analytics System Rewrite Complete (June 25, 2025)
- Completely rewrote sales analytics to use same foundation as original pipeline analysis code
- Fixed Total Pipeline Value to use only most recent uploaded file data (like original)
- Corrected Average Deal Size calculation: Total Pipeline Value / Active Opportunities
- Implemented proper Win Rate: Closed Won / (Closed Won + Closed Lost) for current fiscal year
- Implemented proper Close Rate: Closed Won / (Open Pipeline + Closed Won + Closed Lost) for last 12 months
- Pipeline excludes Validation/Introduction stage (matches original pipeline analysis)
- Sales analytics now work identically to main pipeline page but with optional sales rep filtering

✓ Win Rate Over Time Chart Enhanced (June 26, 2025)
- Removed chart markers (dots) from line graph for cleaner visualization
- Implemented data filtering to exclude win rates over 40% to eliminate artificial spikes
- Added enhanced mouseover functionality showing deal names and Year 1 ARR amounts
- Modified tooltip to display only deals that closed on each specific date (not cumulative)
- Filtered out problematic May 30th data spike (100% win rate) caused by data processing artifacts
- Chart now provides accurate historical win rate trends with detailed deal-level insights

✓ Close Rate Over Time Chart Created and Aligned (June 26, 2025)
- Built new Close Rate Over Time chart positioned next to Win Rate chart (each 2/4 width)
- Created `/api/analytics/close-rate-over-time` endpoint with rolling 12-month calculations
- Fixed calculation methodology discrepancy between Close Rate card and Over Time chart
- Aligned both to use identical rolling 12-month methodology: Closed Won / (All opportunities that entered pipeline in period)
- Enhanced fallback logic: Uses entered_pipeline date if available, otherwise falls back to created date
- Expanded time coverage back to June 2, 2024 for full rolling 12-month analysis
- Excludes Validation/Introduction stage but includes all deals with valid entry dates
- Both components now consistently show 15.4% close rate for latest data point
- Enhanced tooltip functionality with deal details matching Win Rate chart styling

✓ Pipeline by Owner Analytics Card Added (June 19, 2025)
- Created new Pipeline by Owner card showing pipeline metrics grouped by opportunity owner
- Shows both created pipeline (when customer was added to campaign) and current pipeline values
- Uses same pipeline definition as Total Pipeline: Entered Pipeline ≠ null and Close date > campaign start date
- Displays opportunity count and pipeline value for each owner with change indicators
- Added dedicated API endpoint `/api/marketing/campaigns/:id/pipeline-by-owner` with comprehensive logging
- Integrated card into marketing analytics page positioned after Stage Movements card
- Successfully displays real data for 5 owners across 25 qualifying pipeline opportunities

✓ Pipeline by Owner Table Format and New Deals Logic (June 19, 2025)
- Redesigned as clean, readable table with columns: Owner, Total Pipeline #/$, New Pipeline #/$, Current Pipeline #/$, Win Rate
- Updated new deals calculation to only count opportunities created within first 30 days of campaign AND have entered pipeline
- Fixed current pipeline calculation to exclude closed lost opportunities (only excludes closed won/lost)
- Added proper new deals value tracking separate from total pipeline metrics
- Table format provides clear, scannable overview of owner performance metrics
- Removed Closed Won column and updated terminology: "New Deals" → "New Pipeline"

✓ User Management and Permissions System Complete (June 27, 2025)
- Implemented comprehensive role-based access control with 9 predefined roles
- Created user management interface for users with user_management permission
- Added conditional navigation that only shows pages users have access to
- Built permission middleware to protect API routes based on user roles
- Created dedicated user storage layer with role and permission management
- Set up role hierarchy: Default, Admin, Leadership, Marketing, Ops, Finance, Sales, Post-Sales, Engineering
- Added user management page accessible to any role with user_management permission
- Updated Home dashboard to display user role badges and conditional page access
- Configured sampilling@higharc.com as Admin user with full permissions
- Created Default role with no permissions for new users
- Important: Admin users get permissions based on their role, not automatic full access

✓ Stage Movement Overview Card Removed (June 19, 2025)
- Completely removed Stage Movement Overview card from marketing analytics page
- Removed import statement and JSX component usage
- Fixed D3 Sankey chart errors by eliminating the problematic component
- Marketing analytics now focuses on Pipeline Walk Chart and enhanced Stage Movements (New Deals Creation) card
- Simplified user interface with cleaner analytics presentation

✓ Enhanced Customer Exclusion Logic and Display (June 19, 2025)
- Added close date display to both Starting Value and Current Value in campaign customer lists
- Implemented exclusion logic for customers whose current close date is before campaign start date
- Updated analytics calculations to exclude these customers from all metrics (closed won, open opportunities, win rate, starting metrics)
- Enhanced exclusion notices with specific reasons:
  - "Customer not used in the analytics - Closed Won prior to Campaign start" for pre-existing closed won customers
  - "Customer not used in the analytics - No open opportunity after Campaign start" for customers with close dates before campaign start
- Applied exclusion criteria consistently across frontend display and backend analytics calculations
- Removed TCV display from customer lists, showing only Year 1 ARR values
- Added specific exclusion message for customers without pipeline entry: "Customer not used in the analytics - Never entered pipeline"
- Implemented comprehensive customer sorting: first by pipeline status priority (entered pipeline → never entered → closed before campaign → pre-existing closed won), then by name alphabetically within each group
- Modified customer display to show "Current Values" for all customers with exclusion flags placed underneath current values section
- Added analytics status filter with options: Active, Never Entered Pipeline, No Open Opp, and Closed Won Prior for easy customer segmentation

✓ Bulk Customer Import System Complete (June 18, 2025)
- Implemented comprehensive bulk import functionality for campaign customer management
- Created bulk import API endpoint with detailed success/failure tracking
- Added bulk import dialog component with progress monitoring and results display
- Successfully imported 33 customers into Campaign 2 (2025 | Events | IBS) from 66 total provided
- Import used snapshot data from 2/27/2025 or closest available dates for accurate baseline metrics
- System handled duplicates and missing records gracefully with detailed error reporting
- Failed imports: 20 due to multiple opportunities with same name, 13 due to missing database records

✓ Outdated Data Detection and Management (June 18, 2025)
- Implemented automatic detection of customers with outdated snapshot data (>7 days from system latest)
- Customers with outdated data automatically marked as "Closed Lost" in analytics calculations
- Added prominent red warning badges showing "No data after [date]" for affected customers
- Enhanced customer list with alphabetical sorting by name in ascending order
- System ensures accurate campaign performance metrics by handling data gaps appropriately
- Outdated customers treated as "Closed Lost" for win rate and CAC calculations
- Analytics engine properly includes outdated customers in closed lost metrics for accurate ROI assessment

## User Preferences

Preferred communication style: Simple, everyday language.