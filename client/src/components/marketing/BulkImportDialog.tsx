import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BulkImportResult {
  successful: Array<{ name: string; opportunityId: number; snapshotDate: string }>;
  failed: Array<{ name: string; reason: string }>;
}

interface BulkImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: number;
}

const DEFAULT_CUSTOMER_LIST = `Azali Homes
Bear Homes
Berks Homes
Colbrides Homes
Cambridge Homes
Carter + Clark
Cedarglen Homes
Centrel Builders
Choice Builders Group (Epcon)
Classic-d Homes
Cornerstone Development
Couto Homes
David Weekley Homes
Dream Finders Homes
DSLD Homes
Eagle Construction of VA
Eastbrook Homes
Eastwood Homes
EGStrickland
Excel Homes
Fischer Homes
Front Light Building Company
Gan Inc
Green Brick Partners, Inc.
GreenTech Homes
Greenwood Homes
Hayden Homes
Home Development Inc (HDI)
Homes By AV Homes
Jagoe Homes
JTB Homes
K. Hovnanian Homes
Kindred Homes
Landmark24 Homes
Lombardo Homes
MH Homes (corporate office)
Mainvue Homes
Meadowbrook Builders
Mungo Homes
New Leaf Builders
Northern Nevada Homes
NVR, Inc.
Old Town Design Group
OLO Builders
Pacific Lifestyle Homes
Pathlight Homes
Partners Development Group
Perry Homes
Pulte Group
Revolution Homes
Riverwood Homes - Arkansas
Robert Thomas Builders
Rockford Homes
Schumacher Homes
Scott Felder Homes LLC
Shane Homes Group of Companies
Shea Homes
Signature Homes
Skogman Homes
The Color Group
The Providence Group (Green Brick Partners)
Thomas James Homes
Toll Brothers, Inc.
Tri Pointe Group
Visionary Homes
West Homes`;

export function BulkImportDialog({ isOpen, onClose, campaignId }: BulkImportDialogProps) {
  const [customerNames, setCustomerNames] = useState(DEFAULT_CUSTOMER_LIST);
  const [targetDate, setTargetDate] = useState("2025-02-27");
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const { toast } = useToast();

  const bulkImportMutation = useMutation({
    mutationFn: async (data: { customerNames: string[]; targetDate: string }) => {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}/customers/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to import customers');
      }
      
      return response.json() as Promise<BulkImportResult>;
    },
    onSuccess: (result: BulkImportResult) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns', campaignId, 'customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns', campaignId, 'analytics'] });
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.successful.length} customers. ${result.failed.length} failed.`,
      });
    },
    onError: (error) => {
      console.error('Bulk import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import customers. Please check the logs.",
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    const names = customerNames
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    console.log('Starting bulk import with', names.length, 'customers');
    
    bulkImportMutation.mutate({
      customerNames: names,
      targetDate: targetDate,
    });
  };

  const handleClose = () => {
    setImportResult(null);
    onClose();
  };

  const customerCount = customerNames
    .split('\n')
    .map(name => name.trim())
    .filter(name => name.length > 0).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Customers</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!importResult && (
            <>
              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Snapshot Date</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  disabled={bulkImportMutation.isPending}
                />
                <p className="text-sm text-muted-foreground">
                  System will use data from this date or the next available snapshot
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerNames">Customer Names ({customerCount} customers)</Label>
                <Textarea
                  id="customerNames"
                  placeholder="Enter customer names, one per line..."
                  value={customerNames}
                  onChange={(e) => setCustomerNames(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  disabled={bulkImportMutation.isPending}
                />
                <p className="text-sm text-muted-foreground">
                  Enter one customer name per line. Names will be matched against opportunity names and client names in the database.
                </p>
              </div>

              {bulkImportMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 animate-spin" />
                    <span>Importing customers...</span>
                  </div>
                  <Progress value={undefined} className="w-full" />
                </div>
              )}
            </>
          )}

          {importResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{importResult.successful.length} customers imported successfully</strong>
                  </AlertDescription>
                </Alert>

                <Alert variant={importResult.failed.length > 0 ? "destructive" : "default"}>
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{importResult.failed.length} customers failed to import</strong>
                  </AlertDescription>
                </Alert>
              </div>

              {importResult.successful.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-700">Successfully Imported:</h4>
                  <div className="max-h-40 overflow-y-auto bg-green-50 p-3 rounded text-sm">
                    {importResult.successful.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name}</span>
                        <span className="text-muted-foreground">{item.snapshotDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.failed.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-700">Failed to Import:</h4>
                  <div className="max-h-40 overflow-y-auto bg-red-50 p-3 rounded text-sm">
                    {importResult.failed.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name}</span>
                        <span className="text-muted-foreground text-xs">{item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!importResult ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={bulkImportMutation.isPending}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={bulkImportMutation.isPending || customerCount === 0}
              >
                {bulkImportMutation.isPending ? "Importing..." : `Import ${customerCount} Customers`}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}