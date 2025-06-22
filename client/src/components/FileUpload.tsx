import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UploadResult {
  filename: string;
  recordCount?: number;
  snapshotDate?: string;
  status: 'success' | 'error';
  error?: string;
}

interface FileUploadProps {
  onClose: () => void;
}

export default function FileUpload({ onClose }: FileUploadProps) {
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      const response = await apiRequest('POST', '/api/upload', formData);
      return response.json();
    },
    onSuccess: (data) => {
      setUploadResults(data.results);
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      
      const successCount = data.results.filter((r: UploadResult) => r.status === 'success').length;
      toast({
        title: "Upload Complete",
        description: `Successfully processed ${successCount} of ${data.results.length} files.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => 
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')
    );

    if (validFiles.length === 0) {
      toast({
        title: "Invalid Files",
        description: "Please upload only Excel files (.xlsx, .xls) or CSV files (.csv).",
        variant: "destructive",
      });
      return;
    }

    if (validFiles.length !== acceptedFiles.length) {
      toast({
        title: "Some Files Skipped",
        description: "Only Excel and CSV files will be processed.",
        variant: "destructive",
      });
    }

    setIsUploading(true);
    setUploadResults([]);
    uploadMutation.mutate(validFiles);
  }, [uploadMutation, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/octet-stream': ['.xlsx', '.xls'],
      'text/csv': ['.csv'],
      'application/csv': ['.csv']
    },
    multiple: true,
    disabled: isUploading
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Pipeline Files</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}
              ${isUploading ? 'pointer-events-none opacity-50' : 'hover:border-primary hover:bg-primary/5'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-lg text-primary font-medium">Drop the files here...</p>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop Excel or CSV files here or click to browse
                </p>
                <p className="text-sm text-gray-600">
                  Supports .xlsx, .xls, and .csv formats. Expected filename format includes timestamp: Open Pipeline - Finance-YYYY-MM-DD-HH-MM-SS
                </p>
              </>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing files...</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}

          {/* Upload Results */}
          {uploadResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Upload Results</h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {uploadResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      result.status === 'success' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {result.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <FileSpreadsheet className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">
                            {result.filename}
                          </span>
                        </div>
                        {result.status === 'success' && result.recordCount && (
                          <p className="text-xs text-gray-600">
                            {result.recordCount} records processed
                          </p>
                        )}
                        {result.status === 'error' && result.error && (
                          <p className="text-xs text-red-600">{result.error}</p>
                        )}
                      </div>
                    </div>
                    {result.snapshotDate && (
                      <span className="text-xs text-gray-500">
                        {new Date(result.snapshotDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Upload Instructions:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Files should be in .xlsx, .xls, or .csv format</li>
                  <li>• Filename should include timestamp: Open Pipeline - Finance-YYYY-MM-DD-HH-MM-SS</li>
                  <li>• For Excel files: First few rows may contain metadata (will be skipped automatically)</li>
                  <li>• For CSV files: Headers should be in the first row</li>
                  <li>• Headers should include: Opportunity Name, Stage, Expected Revenue, Owner, Client Name</li>
                  <li>• Missing "Entered Pipeline" column is acceptable</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
