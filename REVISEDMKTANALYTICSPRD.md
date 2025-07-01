# 📊 Revised Marketing Analytics PRD - Comprehensive Comparative Analytics Platform

## 🎯 Executive Overview

This PRD outlines a complete redesign of the Marketing Comparative Analytics platform to deliver executive-level insights, detailed performance comparisons, and actionable strategic guidance. The new design transforms the current 5-tab interface into a focused, insight-driven analytics experience.

## 🌟 Current State Analysis

### Existing Implementation
- **5-Tab Interface**: Campaign Types, Campaign Influence, Target Accounts, Team Effectiveness, Strategic Matrix
- **Data Foundation**: campaigns, campaign_customers tables with JSONB team_attendees field
- **Performance**: 7 API endpoints with sub-200ms response times
- **Authentication**: Admin-only access with "marketing_comparative" permission
- **Navigation**: Complete breadcrumb system integrated with main marketing analytics

### Current Limitations
- Tab-heavy interface dilutes focus
- Limited executive summary capabilities
- No time-based trend analysis
- Missing cross-campaign journey insights
- Lack of actionable recommendations

---

# 🌟 1️⃣ Executive Summary Page - Detailed PRD

## 🎯 Objective
Provide users with an immediate snapshot of marketing performance, key results, and top-level guidance on next steps.

## 📌 Key Features

### Metrics Summary (Top Row)
- **Total Pipeline:** Sum of pipeline values across all campaigns
- **Total Closed Won:** Sum of closed won values across all campaigns  
- **Average ROI:** Weighted average ROI (Closed Won / Cost * 100) across all campaigns
- **Average Win Rate:** Weighted average win rate across all campaigns

### Time Series Chart
Line chart showing cumulative:
- Pipeline value over time
- Closed won value over time

### Insight Cards
- **Best Performing Campaign Type:** Highest ROI campaign type with % and name
- **Most Inefficient Campaign Type:** Type with lowest ROI and >X% of budget spend
- **Best Pipeline Efficiency:** Campaign type or individual campaign with best Pipeline/Cost ratio

### Callout Box
Short text summary:
- "Webinars have delivered the highest ROI at 3410%. Consider reducing investment in Events (773% ROI)."

## 📊 Component Breakdown
- `<ExecutiveSummaryMetrics />` → Metric boxes
- `<PipelineOverTimeChart />` → Line chart
- `<ExecutiveInsights />` → Insight cards + callout box

## 🛠 Data Requirements
**Aggregated data:**
- Sum pipeline, closed won, cost per campaign type & campaign
- Time-bucketed pipeline + closed won values (weekly or monthly)
- ROI calculations: (Closed Won / Cost * 100)

## 🧠 Insight Logic
- **Best performing** = max(ROI by type)
- **Most inefficient** = min(ROI by type) where cost > (10% of total cost)
- **Pipeline efficiency** = max(Pipeline / Cost)

## ⚙ File Structure
```
/analytics-comparison/ExecutiveSummary.tsx
/analytics-comparison/hooks/useExecutiveSummaryData.ts
/analytics-comparison/components/ExecutiveSummaryMetrics.tsx
/analytics-comparison/components/PipelineOverTimeChart.tsx
/analytics-comparison/components/ExecutiveInsights.tsx
```

## ⚡ Implementation Notes
✅ Chart lib: Reuse existing (Recharts)  
✅ Use date-fns for time grouping  
✅ All insight text should be generated via helper in `utils/insights.ts`

---

# 🌟 2️⃣ Campaign Type Performance - Detailed PRD

## 🎯 Objective
Compare performance of campaign types, identify strengths, inefficiencies, and budget reallocation opportunities.

## 📌 Key Features

### ROI Bar Chart
- **X-Axis:** Campaign type
- **Y-Axis:** ROI %

### Performance Table
**Columns:**
- Campaign Type
- Campaign Count
- Total Cost
- Pipeline Value
- Closed Won
- Open Opportunities
- ROI %
- Win Rate %
- Pipeline / Cost
- Customer Count

**Features:** Sortable on any column

### Insight Callouts
- Best campaign type (highest ROI %)
- Worst campaign type (lowest ROI %, cost > 10% of spend)
- Suggested reallocation (from worst type → best type)

## 📊 Component Breakdown
- `<CampaignTypeROIBarchart />`
- `<CampaignTypePerformanceTable />`
- `<CampaignTypeInsights />`

## 🛠 Data Requirements
- Group campaigns by type
- **Aggregate:** cost, pipeline, closed won, opp count, customer count
- **Derived:**
  - ROI = (closed won / cost * 100)
  - Pipeline / cost

## 🧠 Insight Logic
- Same as Executive, scoped to type
- **Reallocation:** if worst ROI type cost > 10% → recommend reallocation

## ⚙ File Structure
```
/analytics-comparison/CampaignTypePerformance.tsx
/analytics-comparison/hooks/useCampaignTypeData.ts
/analytics-comparison/components/CampaignTypeROIBarchart.tsx
/analytics-comparison/components/CampaignTypePerformanceTable.tsx
/analytics-comparison/components/CampaignTypeInsights.tsx
```

## ⚡ Implementation Notes
✅ Use existing bar chart styles  
✅ Add hover tooltips on bars (show cost, win rate, pipeline/cost)

---

# 🌟 3️⃣ Campaign Influence - Detailed PRD

## 🎯 Objective
Show individual campaign performance, rank best campaigns, surface common traits.

## 📌 Key Features

### Top 5 ROI Campaign Cards
**Each card shows:**
- Campaign name
- Type
- ROI %
- Pipeline value
- Closed won
- Win rate %
- Cost
- Pipeline efficiency ($ pipeline / $ cost)

### Full Campaign Effectiveness Table
**Columns:**
- Name
- Type
- ROI
- Pipeline
- Closed Won
- Win Rate
- Customers
- Cost
- Pipeline efficiency

**Features:** Sortable, filterable by type

### Insight Box
**Top campaign traits summary:**
- "Top campaigns were mostly Webinars with cost <$20k and target account focus"

## 📊 Component Breakdown
- `<TopCampaignCards />`
- `<CampaignInfluenceTable />`
- `<CampaignInfluenceInsights />`

## 🛠 Data Requirements
- Individual campaign stats
- **Pipeline efficiency:** pipeline / cost

## 🧠 Insight Logic
- **Top campaigns** = top 5 by ROI
- **Traits** = % of top campaigns sharing type, low cost, target ratio

## ⚙ File Structure
```
/analytics-comparison/CampaignInfluence.tsx
/analytics-comparison/hooks/useCampaignInfluenceData.ts
/analytics-comparison/components/TopCampaignCards.tsx
/analytics-comparison/components/CampaignInfluenceTable.tsx
/analytics-comparison/components/CampaignInfluenceInsights.tsx
```

## ⚡ Implementation Notes
✅ Card grid layout  
✅ Table max 20 rows paginated

---

# 🌟 4️⃣ Target Account Strategy - Detailed PRD

## 🎯 Objective
Show target vs non-target account success and optimize strategy.

## 📌 Key Features

### Target vs Non-Target Summary
- Deal Size Advantage
- Win Rate Advantage
- Efficiency Multiplier

### Comparison Table
**Columns:**
- Account Type
- Pipeline
- Closed Won
- Win Rate
- ROI
- Avg Deal Size
- Customer Count

### Recommended Strategy Box
- Attendee count + ROI optimization

### Strategic Engagement Matrix
- **Table:** attendee range x account type

## 📊 Component Breakdown
- `<TargetAccountSummary />`
- `<TargetAccountMatrix />`
- `<TargetAccountInsights />`

## 🛠 Data Requirements
- Split data: target vs non-target
- Group by attendee count

## 🧠 Insight Logic
- **Optimal attendee count** = attendee range with max ROI

## ⚙ File Structure
```
/analytics-comparison/TargetAccountStrategy.tsx
/analytics-comparison/hooks/useTargetAccountData.ts
/analytics-comparison/components/TargetAccountSummary.tsx
/analytics-comparison/components/TargetAccountMatrix.tsx
/analytics-comparison/components/TargetAccountInsights.tsx
```

---

# 🌟 5️⃣ Customer Journey - Detailed PRD

## 🎯 Objective
Show how campaigns moved customers through journey + CAC cost analysis.

## 📌 Key Features

### Touch Distribution Chart
- **Histogram:** # customers by # of touches

### Journey Flow Chart
- **Sankey/Funnel:** touch → stage → closed

### Customer Table
**Columns:**
- Customer
- Touches
- Total CAC
- Pipeline
- Current Stage
- Campaign Types
- Journey Period

### Insight Box
- Multi-touch impact
- Journey bottlenecks

## 📊 Component Breakdown
- `<TouchDistributionChart />`
- `<CustomerJourneyTable />`
- `<CustomerJourneyInsights />`
- `<JourneyFunnel />` (if Sankey added)

## 🛠 Data Requirements
- Customer touch counts
- Stages
- CAC
- Campaigns touched

## 🧠 Insight Logic
- **Multi-touch customers** % of pipeline/closed
- Identify stage with biggest drop

## ⚙ File Structure
```
/analytics-comparison/CustomerJourney.tsx
/analytics-comparison/hooks/useCustomerJourneyData.ts
/analytics-comparison/components/TouchDistributionChart.tsx
/analytics-comparison/components/CustomerJourneyTable.tsx
/analytics-comparison/components/CustomerJourneyInsights.tsx
/analytics-comparison/components/JourneyFunnel.tsx
```

---

# ✅ Implementation Guidelines

## Common Standards
- **File Size Limit:** No file > 300 lines
- **Insight Helpers:** All insight text helpers live in `utils/insights.ts`
- **Type Definitions:** All pages import from shared `types.ts`
- **Consistent Styling:** Use existing shadcn/ui patterns
- **Performance:** Maintain <200ms API response times
- **Authentication:** Preserve Admin-only access

## Technical Requirements
- **Framework:** React + TypeScript with existing Vite setup
- **Charts:** Recharts library (existing)
- **Data Management:** React Query patterns
- **Styling:** TailwindCSS + shadcn/ui components
- **Date Handling:** date-fns library
- **Database:** PostgreSQL via existing Drizzle ORM

## Migration Strategy
- **Phase 1:** Executive Summary (replace current tab 1)
- **Phase 2:** Campaign Type Performance (enhance current analysis)
- **Phase 3:** Campaign Influence (transform current rankings)
- **Phase 4:** Target Account Strategy (rebuild matrix)
- **Phase 5:** Customer Journey (new multi-touch analysis)

## Success Metrics
- **User Engagement:** Time spent on each page
- **Insight Accuracy:** Validation of generated recommendations
- **Performance:** API response times <200ms
- **Adoption:** Usage frequency vs old interface

---

# 📋 Next Steps

1. **Review & Approval:** Stakeholder review of PRD specifications
2. **Technical Architecture:** Detailed component and API design
3. **Implementation Checklist:** Break down into weekly sprints
4. **Rollback Plan:** Maintain existing functionality during migration
5. **Testing Strategy:** Comprehensive QA for each phase

---

**Document Version:** 1.0  
**Created:** July 1, 2025  
**Status:** Ready for Implementation  
**Owner:** Development Team