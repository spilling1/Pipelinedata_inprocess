export interface ISettingsStorage {
  // Settings
  getStageMappings(): Promise<Array<{ from: string; to: string }>>;
  setStageMappings(mappings: Array<{ from: string; to: string }>): Promise<void>;
  getProbabilityConfigs(): Promise<Array<{ stage: string; confidence: string; probability: number }>>;
  setProbabilityConfigs(configs: Array<{ stage: string; confidence: string; probability: number }>): Promise<void>;
}

export class PostgreSQLSettingsStorage implements ISettingsStorage {
  private stageMappings: Array<{ from: string; to: string }> = [
    { from: 'develop', to: 'Developing Champions' },
    { from: 'decision', to: 'Negotiation/Review' }
  ];
  
  private probabilityConfigs: Array<{ stage: string; confidence: string; probability: number }> = [
    { stage: 'Qualify', confidence: 'Upside', probability: 10 },
    { stage: 'Qualify', confidence: 'Best Case', probability: 20 },
    { stage: 'Qualify', confidence: 'Commit', probability: 30 },
    { stage: 'Developing Champions', confidence: 'Upside', probability: 30 },
    { stage: 'Developing Champions', confidence: 'Best Case', probability: 40 },
    { stage: 'Developing Champions', confidence: 'Commit', probability: 50 },
    { stage: 'Value Proposition', confidence: 'Upside', probability: 40 },
    { stage: 'Value Proposition', confidence: 'Best Case', probability: 50 },
    { stage: 'Value Proposition', confidence: 'Commit', probability: 60 },
    { stage: 'Business Case', confidence: 'Upside', probability: 50 },
    { stage: 'Business Case', confidence: 'Best Case', probability: 60 },
    { stage: 'Business Case', confidence: 'Commit', probability: 70 },
    { stage: 'Validation', confidence: 'Upside', probability: 60 },
    { stage: 'Validation', confidence: 'Best Case', probability: 70 },
    { stage: 'Validation', confidence: 'Commit', probability: 80 },
    { stage: 'Negotiation/Review', confidence: 'Upside', probability: 80 },
    { stage: 'Negotiation/Review', confidence: 'Best Case', probability: 90 },
    { stage: 'Negotiation/Review', confidence: 'Commit', probability: 95 },
    { stage: 'Closed Won', confidence: 'Closed', probability: 100 },
    { stage: 'Otherwise', confidence: '', probability: 0 }
  ];

  async getStageMappings(): Promise<Array<{ from: string; to: string }>> {
    return [...this.stageMappings];
  }

  async setStageMappings(mappings: Array<{ from: string; to: string }>): Promise<void> {
    this.stageMappings = [...mappings];
  }

  async getProbabilityConfigs(): Promise<Array<{ stage: string; confidence: string; probability: number }>> {
    return [...this.probabilityConfigs];
  }

  async setProbabilityConfigs(configs: Array<{ stage: string; confidence: string; probability: number }>): Promise<void> {
    this.probabilityConfigs = [...configs];
  }
}

export const settingsStorage = new PostgreSQLSettingsStorage();