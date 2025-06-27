import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

interface StageMapping {
  from: string;
  to: string;
}

interface ProbabilityConfig {
  stage: string;
  confidence: string;
  probability: number;
}

export default function Settings() {
  const [stageMappings, setStageMappings] = useState<StageMapping[]>([]);
  const [probabilityConfigs, setProbabilityConfigs] = useState<ProbabilityConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load current settings
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const loadSettings = async () => {
    try {
      await Promise.all([loadStageMappings(), loadProbabilityConfigs()]);
    } finally {
      setLoading(false);
    }
  };

  const loadStageMappings = async () => {
    try {
      const response = await fetch('/api/settings/stage-mappings');
      if (response.ok) {
        const data = await response.json();
        setStageMappings(data.mappings || []);
      }
    } catch (error) {
      console.error('Failed to load stage mappings:', error);
    }
  };

  const loadProbabilityConfigs = async () => {
    try {
      const response = await fetch('/api/settings/probability-configs');
      if (response.ok) {
        const data = await response.json();
        setProbabilityConfigs(data.configs || getDefaultProbabilityConfigs());
      } else {
        // Use default configs if none exist
        setProbabilityConfigs(getDefaultProbabilityConfigs());
      }
    } catch (error) {
      console.error('Failed to load probability configs:', error);
      setProbabilityConfigs(getDefaultProbabilityConfigs());
    }
  };

  const getDefaultProbabilityConfigs = (): ProbabilityConfig[] => [
    { stage: 'Validation/Introduction', confidence: 'Pipeline', probability: 0 },
    { stage: 'Validation/Introduction', confidence: 'Upside', probability: 0 },
    { stage: 'Discover', confidence: 'Pipeline', probability: 10 },
    { stage: 'Discover', confidence: 'Upside', probability: 15 },
    { stage: 'Discover', confidence: 'Likely', probability: 20 },
    { stage: 'Developing Champions', confidence: 'Pipeline', probability: 30 },
    { stage: 'Developing Champions', confidence: 'Upside', probability: 35 },
    { stage: 'Developing Champions', confidence: 'Likely', probability: 45 },
    { stage: 'ROI Analysis/Pricing', confidence: 'Pipeline', probability: 50 },
    { stage: 'ROI Analysis/Pricing', confidence: 'Upside', probability: 55 },
    { stage: 'ROI Analysis/Pricing', confidence: 'Likely', probability: 65 },
    { stage: 'Negotiation/Review', confidence: 'Likely', probability: 75 },
    { stage: 'Negotiation/Review', confidence: 'Upside', probability: 85 },
    { stage: 'Negotiation/Review', confidence: 'Commit', probability: 95 },
    { stage: 'Closed Won', confidence: 'Closed', probability: 100 },
    { stage: 'Otherwise', confidence: '', probability: 0 }
  ];

  const saveStageMappings = async () => {
    try {
      const response = await fetch('/api/settings/stage-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: stageMappings })
      });

      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "Stage mappings have been updated successfully."
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save stage mappings. Please try again.",
        variant: "destructive"
      });
    }
  };

  const saveProbabilityConfigs = async () => {
    try {
      const response = await fetch('/api/settings/probability-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: probabilityConfigs })
      });

      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "Probability configurations have been updated successfully."
        });
      } else {
        throw new Error('Failed to save probability configs');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save probability configurations. Please try again.",
        variant: "destructive"
      });
    }
  };

  const addMapping = () => {
    setStageMappings([...stageMappings, { from: '', to: '' }]);
  };

  const removeMapping = (index: number) => {
    setStageMappings(stageMappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, field: 'from' | 'to', value: string) => {
    const updated = [...stageMappings];
    updated[index][field] = value;
    setStageMappings(updated);
  };

  const addProbabilityConfig = () => {
    setProbabilityConfigs([...probabilityConfigs, { stage: '', confidence: '', probability: 0 }]);
  };

  const removeProbabilityConfig = (index: number) => {
    setProbabilityConfigs(probabilityConfigs.filter((_, i) => i !== index));
  };

  const updateProbabilityConfig = (index: number, field: 'stage' | 'confidence' | 'probability', value: string | number) => {
    const updated = [...probabilityConfigs];
    if (field === 'probability') {
      updated[index][field] = typeof value === 'string' ? parseFloat(value) || 0 : value;
    } else {
      updated[index][field] = value as string;
    }
    setProbabilityConfigs(updated);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <Link href="/dashboard" className="inline-flex items-center">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure system behavior and data processing rules
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stage Name Mappings</CardTitle>
          <CardDescription>
            Define how stage names in your Excel files should be normalized. 
            For example, map "Develop" to "Developing Champions" for consistent reporting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {stageMappings.map((mapping, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <Label htmlFor={`from-${index}`} className="text-sm">From (Excel)</Label>
                  <Input
                    id={`from-${index}`}
                    placeholder="e.g., Develop"
                    value={mapping.from}
                    onChange={(e) => updateMapping(index, 'from', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor={`to-${index}`} className="text-sm">To (Standard)</Label>
                  <Input
                    id={`to-${index}`}
                    placeholder="e.g., Developing Champions"
                    value={mapping.to}
                    onChange={(e) => updateMapping(index, 'to', e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="mt-6"
                  onClick={() => removeMapping(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {stageMappings.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No stage mappings configured. Click "Add Mapping" to create your first rule.
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <Button onClick={addMapping} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
            <Button onClick={saveStageMappings}>
              Save Changes
            </Button>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mt-6">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• When processing Excel files, stage names will be automatically converted</li>
              <li>• Mappings are case-insensitive (e.g., "develop" matches "Develop")</li>
              <li>• Changes apply to newly uploaded files</li>
              <li>• Standard stage names ensure consistent reporting across all analytics</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Probability Chart Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Probability Chart Configuration</CardTitle>
          <CardDescription>
            Configure closing probability percentages for different stage and confidence combinations.
            These values are used for forecasting and weighted pipeline calculations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Probability configuration table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 grid grid-cols-4 gap-4 font-medium text-sm">
                <div>Stage</div>
                <div>Confidence</div>
                <div>Probability (%)</div>
                <div>Actions</div>
              </div>
              <div className="divide-y">
                {probabilityConfigs.map((config, index) => (
                  <div key={index} className="px-4 py-3 grid grid-cols-4 gap-4 items-center">
                    <Input
                      placeholder="Stage name"
                      value={config.stage}
                      onChange={(e) => updateProbabilityConfig(index, 'stage', e.target.value)}
                    />
                    <Input
                      placeholder="Confidence level"
                      value={config.confidence}
                      onChange={(e) => updateProbabilityConfig(index, 'confidence', e.target.value)}
                    />
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={config.probability}
                        onChange={(e) => updateProbabilityConfig(index, 'probability', e.target.value)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeProbabilityConfig(index)}
                      className="w-fit"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {probabilityConfigs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No probability configurations. Click "Add Configuration" to create your first rule.
              </div>
            )}

            <div className="flex items-center gap-3 pt-4">
              <Button onClick={addProbabilityConfig} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Configuration
              </Button>
              <Button onClick={saveProbabilityConfigs}>
                Save Probability Settings
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mt-6">
              <h4 className="font-medium mb-2">Usage:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Set probability percentages for each stage and confidence combination</li>
                <li>• Higher confidence levels should have higher probability percentages</li>
                <li>• "Closed Won" should typically be 100%, while early stages are lower</li>
                <li>• These values are used for weighted pipeline forecasting</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}