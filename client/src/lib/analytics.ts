import { Opportunity, Snapshot } from '@shared/schema';

export interface PipelineMetrics {
  totalY1Value: number;
  activeCount: number;
  avgDealSize: number;
  conversionRate: number;
}

export interface StageDistribution {
  stage: string;
  count: number;
  value: number;
}

export interface DealMovement {
  opportunityName: string;
  from: string;
  to: string;
  date: Date;
  value: number;
}

export interface PipelineValuePoint {
  date: Date;
  value: number;
}

export class AnalyticsEngine {
  static calculateMetrics(opportunities: Array<Opportunity & { latestSnapshot?: Snapshot }>): PipelineMetrics {
    // Debug logging
    console.log('📊 Total opportunities:', opportunities.length);
    console.log('📊 Opportunities with snapshots:', opportunities.filter(o => o.latestSnapshot).length);
    console.log('📊 Opportunities starting with 006R:', opportunities.filter(o => o.name?.startsWith('006R')).length);
    
    const activeOpportunities = opportunities.filter(opp => {
      // Must have a latest snapshot
      if (!opp.latestSnapshot) return false;
      
      // Must have opportunity ID starting with 006
      if (!opp.opportunityId || !opp.opportunityId.startsWith('006')) return false;
      
      // Must not be in closed or validated stages
      const stage = opp.latestSnapshot.stage;
      if (!stage) return false;
      
      const isActive = !stage.includes('Closed Won') && 
                      !stage.includes('Closed Lost') && 
                      !stage.includes('Validation/Introduction');
      
      if (isActive) {
        console.log('📊 Active opportunity:', opp.name, 'Stage:', stage);
      }
      
      return isActive;
    });
    
    const totalY1Value = activeOpportunities.reduce((sum, opp) => sum + (opp.latestSnapshot?.year1_arr || 0), 0);
    const activeCount = activeOpportunities.length;
    const avgDealSize = activeCount > 0 ? totalY1Value / activeCount : 0;
    
    // Conversion rate would require historical win/loss data
    const conversionRate = 0;

    return {
      totalY1Value,
      activeCount,
      avgDealSize,
      conversionRate
    };
  }

  static calculateStageDistribution(opportunities: Array<Opportunity & { latestSnapshot?: Snapshot }>): StageDistribution[] {
    const stageMap = new Map<string, { count: number; value: number }>();

    opportunities.forEach(opp => {
      if (opp.latestSnapshot?.stage) {
        const stage = opp.latestSnapshot.stage;
        const current = stageMap.get(stage) || { count: 0, value: 0 };
        stageMap.set(stage, {
          count: current.count + 1,
          value: current.value + (opp.latestSnapshot.year1_arr || 0)
        });
      }
    });

    return Array.from(stageMap.entries()).map(([stage, data]) => ({
      stage,
      ...data
    }));
  }

  static calculatePipelineValueTrend(snapshots: Snapshot[]): PipelineValuePoint[] {
    const valueByDate = new Map<string, number>();
    
    snapshots.forEach(snapshot => {
      const dateKey = new Date(snapshot.snapshotDate).toISOString().split('T')[0];
      const currentValue = valueByDate.get(dateKey) || 0;
      valueByDate.set(dateKey, currentValue + (snapshot.year1_arr || 0));
    });

    return Array.from(valueByDate.entries())
      .map(([dateStr, value]) => ({ date: new Date(dateStr), value }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  static calculateDealMovements(
    opportunities: Opportunity[], 
    snapshots: Snapshot[], 
    days: number = 30
  ): DealMovement[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const movements: DealMovement[] = [];
    const opportunityMap = new Map(opportunities.map(opp => [opp.id, opp]));

    // Group snapshots by opportunity
    const snapshotsByOpp = new Map<number, Snapshot[]>();
    snapshots.forEach(snapshot => {
      if (snapshot.opportunityId) {
        if (!snapshotsByOpp.has(snapshot.opportunityId)) {
          snapshotsByOpp.set(snapshot.opportunityId, []);
        }
        snapshotsByOpp.get(snapshot.opportunityId)!.push(snapshot);
      }
    });

    // Analyze movements for each opportunity
    snapshotsByOpp.forEach((oppSnapshots, oppId) => {
      const sortedSnapshots = oppSnapshots.sort((a, b) => 
        new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
      );

      const opportunity = opportunityMap.get(oppId);
      
      for (let i = 1; i < sortedSnapshots.length; i++) {
        const current = sortedSnapshots[i];
        const previous = sortedSnapshots[i - 1];
        
        if (new Date(current.snapshotDate) >= cutoffDate && 
            current.stage !== previous.stage &&
            current.stage && previous.stage) {
          movements.push({
            opportunityName: opportunity?.name || 'Unknown',
            from: previous.stage,
            to: current.stage,
            date: new Date(current.snapshotDate),
            value: current.amount || 0
          });
        }
      }
    });

    return movements.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  static calculateStagePerformance(opportunities: Opportunity[], snapshots: Snapshot[]) {
    // Calculate average time in each stage
    const stageTimeMap = new Map<string, number[]>();
    const opportunityMap = new Map(opportunities.map(opp => [opp.id, opp]));

    // Group snapshots by opportunity
    const snapshotsByOpp = new Map<number, Snapshot[]>();
    snapshots.forEach(snapshot => {
      if (snapshot.opportunityId) {
        if (!snapshotsByOpp.has(snapshot.opportunityId)) {
          snapshotsByOpp.set(snapshot.opportunityId, []);
        }
        snapshotsByOpp.get(snapshot.opportunityId)!.push(snapshot);
      }
    });

    // Calculate time in each stage
    snapshotsByOpp.forEach((oppSnapshots) => {
      const sortedSnapshots = oppSnapshots.sort((a, b) => 
        new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
      );

      for (let i = 1; i < sortedSnapshots.length; i++) {
        const current = sortedSnapshots[i];
        const previous = sortedSnapshots[i - 1];
        
        if (previous.stage) {
          const daysInStage = Math.abs(
            new Date(current.snapshotDate).getTime() - 
            new Date(previous.snapshotDate).getTime()
          ) / (1000 * 60 * 60 * 24);
          
          if (!stageTimeMap.has(previous.stage)) {
            stageTimeMap.set(previous.stage, []);
          }
          stageTimeMap.get(previous.stage)!.push(daysInStage);
        }
      }
    });

    // Calculate averages
    const stagePerformance = Array.from(stageTimeMap.entries()).map(([stage, times]) => ({
      stage,
      avgDays: times.reduce((sum, time) => sum + time, 0) / times.length,
      minDays: Math.min(...times),
      maxDays: Math.max(...times)
    }));

    return stagePerformance;
  }
}
