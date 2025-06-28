import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Database, Download, Trash2, Play, File, Calendar, Filter, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

interface DatabaseTable {
  table_name: string;
  row_count: number;
}

interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  error?: string;
}

interface UploadedFile {
  id: number;
  filename: string;
  uploadDate: string;
  snapshotDate: string | null;
  recordCount: number;
  status: string;
}

interface Snapshot {
  id: number;
  opportunity_id: number;
  snapshot_date: string;
  stage: string;
  confidence: string;
  opportunity_name: string;
  account_name: string;
  amount: number;
  expected_close_date: string | null;
  close_date: string | null;
  tcv: number | null;
  year1_value: number | null;
  homes_built: number | null;
  stage_duration: number | null;
  age: number | null;
}

export default function DatabasePage() {
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM snapshots LIMIT 10;');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fileToDelete, setFileToDelete] = useState<UploadedFile | null>(null);
  const [activeTab, setActiveTab] = useState('tables');
  // Snapshots filters - default to last 3 days
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 3);
    return date.toISOString().split('T')[0];
  };
  
  const getDefaultEndDate = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  const [snapshotStartDate, setSnapshotStartDate] = useState(getDefaultStartDate());
  const [snapshotEndDate, setSnapshotEndDate] = useState(getDefaultEndDate());
  const [accountFilter, setAccountFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [debouncedAccountFilter, setDebouncedAccountFilter] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounce account filter with 500ms delay
  const debouncedSetAccountFilter = useCallback(
    useMemo(() => {
      let timeoutId: NodeJS.Timeout;
      return (value: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setDebouncedAccountFilter(value);
        }, 500);
      };
    }, []),
    []
  );

  // Update debounced filter when account filter changes
  const handleAccountFilterChange = (value: string) => {
    setAccountFilter(value);
    debouncedSetAccountFilter(value);
  };

  // Fetch database tables and their row counts
  const { data: tables, isLoading: tablesLoading } = useQuery({
    queryKey: ['/api/database/tables'],
    queryFn: async () => {
      const response = await fetch('/api/database/tables');
      return response.json();
    }
  });

  // Fetch uploaded files with optional date filtering
  const { data: uploadedFiles, isLoading: filesLoading } = useQuery({
    queryKey: ['/api/files', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/files?${params}`);
      return response.json();
    }
  });

  // Fetch snapshots with optional filtering
  const { data: snapshots, isLoading: snapshotsLoading } = useQuery({
    queryKey: ['/api/snapshots', snapshotStartDate, snapshotEndDate, debouncedAccountFilter, stageFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (snapshotStartDate) params.append('startDate', snapshotStartDate);
      if (snapshotEndDate) params.append('endDate', snapshotEndDate);
      if (debouncedAccountFilter) params.append('account', debouncedAccountFilter);
      if (stageFilter) params.append('stage', stageFilter);
      
      const response = await fetch(`/api/snapshots?${params}`);
      return response.json();
    }
  });

  // Execute SQL query mutation
  const executeSqlMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch('/api/database/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      return response.json();
    },
    onSuccess: (data) => {
      setQueryResult(data);
      if (data.error) {
        toast({
          title: "Query Error",
          description: data.error,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Query Executed",
          description: `Returned ${data.rowCount} rows`
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Execution Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Clear all data mutation
  const clearDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/data/clear', {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Data Cleared",
        description: "All data has been removed from the database"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/database/tables'] });
      setQueryResult(null);
    },
    onError: (error: any) => {
      toast({
        title: "Clear Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete uploaded file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: (data, fileId) => {
      toast({
        title: "File Deleted",
        description: `File and all associated snapshot data have been removed`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/database/tables'] });
      setFileToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete file",
        variant: "destructive"
      });
    }
  });

  const handleExecuteQuery = () => {
    if (!sqlQuery.trim()) return;
    executeSqlMutation.mutate(sqlQuery);
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setSqlQuery(`SELECT * FROM ${tableName} LIMIT 50;`);
    
    // If clicked on uploaded_files table, switch to files tab
    if (tableName === 'uploaded_files') {
      setActiveTab('files');
    }
    // If clicked on snapshots table, switch to snapshots tab
    else if (tableName === 'snapshots') {
      setActiveTab('snapshots');
    }
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear ALL data? This action cannot be undone.')) {
      clearDataMutation.mutate();
    }
  };

  const downloadResults = () => {
    if (!queryResult || !queryResult.rows.length) return;
    
    const csvContent = [
      queryResult.columns.join(','),
      ...queryResult.rows.map(row => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Database Management
          </h1>
          <p className="text-muted-foreground mt-2">
            View, query, and manage your pipeline database
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="tables">Tables Overview</TabsTrigger>
          <TabsTrigger value="files">Uploaded Files</TabsTrigger>
          <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
          <TabsTrigger value="query">SQL Query</TabsTrigger>
          <TabsTrigger value="management">Data Management</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Tables</CardTitle>
              <CardDescription>
                Overview of all tables organized by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tablesLoading ? (
                <div className="text-center py-8">Loading tables...</div>
              ) : (
                <div className="space-y-8">
                  {/* Core Tables */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-blue-700 dark:text-blue-400">Core</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {tables?.filter((table: DatabaseTable) => 
                        ['opportunities', 'snapshots', 'uploaded_files'].includes(table.table_name)
                      ).map((table: DatabaseTable) => (
                        <Card 
                          key={table.table_name}
                          className={`cursor-pointer transition-colors hover:bg-accent ${
                            selectedTable === table.table_name ? 'bg-accent' : ''
                          }`}
                          onClick={() => handleTableSelect(table.table_name)}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">{table.table_name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {table.row_count.toLocaleString()} records
                                </p>
                              </div>
                              <Badge variant="secondary">
                                {table.row_count}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Marketing Tables */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-orange-700 dark:text-orange-400">Marketing</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {tables?.filter((table: DatabaseTable) => 
                        ['campaigns', 'campaign_customers', 'campaign_types', 'influence_methods'].includes(table.table_name)
                      ).map((table: DatabaseTable) => (
                        <Card 
                          key={table.table_name}
                          className={`cursor-pointer transition-colors hover:bg-accent ${
                            selectedTable === table.table_name ? 'bg-accent' : ''
                          }`}
                          onClick={() => handleTableSelect(table.table_name)}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">{table.table_name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {table.row_count.toLocaleString()} records
                                </p>
                              </div>
                              <Badge variant="secondary">
                                {table.row_count}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Settings Tables */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-purple-700 dark:text-purple-400">Settings</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {tables?.filter((table: DatabaseTable) => 
                        ['users', 'sessions'].includes(table.table_name)
                      ).map((table: DatabaseTable) => (
                        <Card 
                          key={table.table_name}
                          className={`cursor-pointer transition-colors hover:bg-accent ${
                            selectedTable === table.table_name ? 'bg-accent' : ''
                          }`}
                          onClick={() => handleTableSelect(table.table_name)}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">{table.table_name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {table.row_count.toLocaleString()} records
                                </p>
                              </div>
                              <Badge variant="secondary">
                                {table.row_count}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Other Tables (if any exist that don't fit the above categories) */}
                  {tables?.filter((table: DatabaseTable) => 
                    !['opportunities', 'snapshots', 'uploaded_files', 'campaigns', 'campaign_customers', 'campaign_types', 'influence_methods', 'users', 'sessions'].includes(table.table_name)
                  ).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-400">Other</h3>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {tables?.filter((table: DatabaseTable) => 
                          !['opportunities', 'snapshots', 'uploaded_files', 'campaigns', 'campaign_customers', 'campaign_types', 'influence_methods', 'users', 'sessions'].includes(table.table_name)
                        ).map((table: DatabaseTable) => (
                          <Card 
                            key={table.table_name}
                            className={`cursor-pointer transition-colors hover:bg-accent ${
                              selectedTable === table.table_name ? 'bg-accent' : ''
                            }`}
                            onClick={() => handleTableSelect(table.table_name)}
                          >
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold">{table.table_name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {table.row_count.toLocaleString()} records
                                  </p>
                                </div>
                                <Badge variant="secondary">
                                  {table.row_count}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <File className="h-5 w-5" />
                Uploaded Files Management
              </CardTitle>
              <CardDescription>
                View, filter, and manage uploaded files and their associated snapshot data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Range Filter */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Label htmlFor="start-date">From:</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="end-date">To:</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  size="sm"
                >
                  Clear
                </Button>
              </div>

              {/* Files List */}
              {filesLoading ? (
                <div className="text-center py-8">Loading uploaded files...</div>
              ) : uploadedFiles && uploadedFiles.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Uploaded Files</h3>
                    <Badge variant="outline">
                      {uploadedFiles.length} files
                    </Badge>
                  </div>
                  
                  <ScrollArea className="h-[500px] w-full border rounded-md">
                    <div className="min-w-max">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Filename</TableHead>
                            <TableHead>Upload Date</TableHead>
                            <TableHead>Snapshot Date</TableHead>
                            <TableHead>Records</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uploadedFiles.map((file: UploadedFile) => (
                            <TableRow key={file.id}>
                            <TableCell className="font-medium max-w-[200px]">
                              <div className="truncate" title={file.filename}>
                                {file.filename}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(file.uploadDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                              </div>
                            </TableCell>
                            <TableCell>
                              {file.snapshotDate ? (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {new Date(file.snapshotDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">No date</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {file.recordCount.toLocaleString()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={file.status === 'processed' ? 'default' : 'destructive'}
                              >
                                {file.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    onClick={() => setFileToDelete(file)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete File and Data</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this file? This will remove:
                                      <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>The uploaded file record: <strong>{file.filename}</strong></li>
                                        {file.snapshotDate && (
                                          <li>All snapshot data for date: <strong>{new Date(file.snapshotDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</strong></li>
                                        )}
                                        <li>Approximately <strong>{file.recordCount}</strong> records</li>
                                      </ul>
                                      <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                        <strong className="text-destructive">Warning:</strong> This action cannot be undone.
                                      </div>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteFileMutation.mutate(file.id)}
                                      disabled={deleteFileMutation.isPending}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {deleteFileMutation.isPending ? 'Deleting...' : 'Delete File & Data'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-12">
                  <File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Files Found</h3>
                  <p className="text-muted-foreground">
                    {startDate || endDate 
                      ? 'No uploaded files found for the selected date range.' 
                      : 'No files have been uploaded yet.'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snapshots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Snapshots Management
              </CardTitle>
              <CardDescription>
                View and filter snapshot data by date range, account name, and stage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label htmlFor="snapshot-start-date">From:</Label>
                  <Input
                    id="snapshot-start-date"
                    type="date"
                    value={snapshotStartDate}
                    onChange={(e) => setSnapshotStartDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="snapshot-end-date">To:</Label>
                  <Input
                    id="snapshot-end-date"
                    type="date"
                    value={snapshotEndDate}
                    onChange={(e) => setSnapshotEndDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="account-filter">Account:</Label>
                  <Input
                    id="account-filter"
                    type="text"
                    placeholder="Filter by account name"
                    value={accountFilter}
                    onChange={(e) => handleAccountFilterChange(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="stage-filter">Stage:</Label>
                  <Input
                    id="stage-filter"
                    type="text"
                    placeholder="Filter by stage"
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="col-span-full">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSnapshotStartDate(getDefaultStartDate());
                      setSnapshotEndDate(getDefaultEndDate());
                      setAccountFilter('');
                      setDebouncedAccountFilter('');
                      setStageFilter('');
                    }}
                    size="sm"
                  >
                    Reset to Last 3 Days
                  </Button>
                </div>
              </div>

              {/* Snapshots List */}
              {snapshotsLoading ? (
                <div className="text-center py-8">Loading snapshots...</div>
              ) : snapshots && snapshots.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Snapshot Data</h3>
                    <Badge variant="outline">
                      {snapshots.length} records
                    </Badge>
                  </div>
                  
                  <ScrollArea className="h-[600px] w-full border rounded-md">
                    <div className="min-w-max">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Opportunity</TableHead>
                            <TableHead>Account</TableHead>
                            <TableHead>Stage</TableHead>
                            <TableHead>Confidence</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>TCV</TableHead>
                            <TableHead>Snapshot Date</TableHead>
                            <TableHead>Expected Close</TableHead>
                            <TableHead>Age (Days)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {snapshots.map((snapshot: Snapshot) => (
                            <TableRow key={snapshot.id}>
                              <TableCell className="font-medium max-w-[200px]">
                                <div className="truncate" title={snapshot.opportunity_name}>
                                  {snapshot.opportunity_name}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[150px]">
                                <div className="truncate" title={snapshot.account_name}>
                                  {snapshot.account_name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {snapshot.stage}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {snapshot.confidence}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-right font-mono">
                                  ${snapshot.amount?.toLocaleString() || '0'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-right font-mono">
                                  ${snapshot.tcv?.toLocaleString() || '0'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {new Date(snapshot.snapshot_date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                                </div>
                              </TableCell>
                              <TableCell>
                                {snapshot.expected_close_date ? (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    {new Date(snapshot.expected_close_date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground italic">No date</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {snapshot.age || 0}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Snapshots Found</h3>
                  <p className="text-muted-foreground">
                    No snapshots found for the last 3 days with the current filters. Try expanding the date range or adjusting filters.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="query" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SQL Query Editor</CardTitle>
              <CardDescription>
                Execute custom SQL queries against your database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">SQL Query</label>
                <Textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="Enter your SQL query here..."
                  className="min-h-[120px] font-mono"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleExecuteQuery}
                  disabled={executeSqlMutation.isPending || !sqlQuery.trim()}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {executeSqlMutation.isPending ? 'Executing...' : 'Execute Query'}
                </Button>
                
                {queryResult && queryResult.rows.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={downloadResults}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download CSV
                  </Button>
                )}
              </div>

              {queryResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Query Results</h3>
                    <Badge variant="outline">
                      {queryResult.rowCount} rows
                    </Badge>
                  </div>
                  
                  {queryResult.error ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{queryResult.error}</AlertDescription>
                    </Alert>
                  ) : (
                    <ScrollArea className="h-[400px] w-full border rounded-md">
                      <div className="min-w-max">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {queryResult.columns.map((column, index) => (
                                <TableHead key={index} className="font-semibold whitespace-nowrap">
                                  {column}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {queryResult.rows && Array.isArray(queryResult.rows) ? queryResult.rows.map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {Array.isArray(row) ? row.map((cell, cellIndex) => (
                                  <TableCell key={cellIndex} className="font-mono text-xs whitespace-nowrap">
                                    {cell === null ? (
                                      <span className="text-muted-foreground italic">null</span>
                                    ) : (
                                      String(cell)
                                    )}
                                  </TableCell>
                                )) : (
                                  <TableCell className="font-mono text-xs whitespace-nowrap">
                                    {row === null ? (
                                      <span className="text-muted-foreground italic">null</span>
                                    ) : (
                                      String(row)
                                    )}
                                  </TableCell>
                                )}
                              </TableRow>
                            )) : (
                              <TableRow>
                                <TableCell colSpan={queryResult.columns?.length || 1} className="text-center text-muted-foreground">
                                  No data available
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="management" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Tools for managing your database data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Use these tools carefully. Data operations cannot be undone.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-red-600 mb-2">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This will permanently delete all data from your database including opportunities, snapshots, and uploaded files.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleClearData}
                    disabled={clearDataMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {clearDataMutation.isPending ? 'Clearing...' : 'Clear All Data'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}