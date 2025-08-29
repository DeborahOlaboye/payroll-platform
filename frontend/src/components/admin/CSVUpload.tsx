import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { DocumentArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { formatUSDC, getChainDisplayName } from '@usdc-payroll/shared';
import toast from 'react-hot-toast';

interface CSVUploadProps {
  onUploadSuccess: (data: any) => void;
}

export function CSVUpload({ onUploadSuccess }: CSVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const response = await api.uploadCSV(file);
      setUploadedData(response.data);
      toast.success('CSV uploaded and validated successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload CSV';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const handleCreatePayroll = () => {
    if (uploadedData) {
      onUploadSuccess(uploadedData);
    }
  };

  const downloadTemplate = async () => {
    try {
      const blob = await api.downloadCSVTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'payroll-template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Template downloaded!');
    } catch (err) {
      toast.error('Failed to download template');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-gray-900">Upload Payroll CSV</h3>
          <p className="text-sm text-gray-600">
            Upload a CSV file with worker details for batch USDC payouts
          </p>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-medium text-gray-900">CSV Format</h4>
                <p className="text-xs text-gray-500">
                  Required columns: name, email, amount, chain
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={downloadTemplate}
              >
                Download Template
              </Button>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-circle-400 bg-circle-50'
                  : error
                  ? 'border-error-300 bg-error-50'
                  : uploadedData
                  ? 'border-success-300 bg-success-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              
              {uploading ? (
                <div className="space-y-2">
                  <div className="loading-spinner mx-auto" />
                  <p className="text-sm text-gray-600">Processing CSV...</p>
                </div>
              ) : uploadedData ? (
                <div className="space-y-2">
                  <CheckCircleIcon className="w-12 h-12 text-success-500 mx-auto" />
                  <p className="text-sm font-medium text-success-700">
                    CSV uploaded successfully!
                  </p>
                  <p className="text-xs text-success-600">
                    {uploadedData.summary.totalWorkers} workers, {formatUSDC(uploadedData.summary.totalAmount)} total
                  </p>
                </div>
              ) : error ? (
                <div className="space-y-2">
                  <ExclamationTriangleIcon className="w-12 h-12 text-error-500 mx-auto" />
                  <p className="text-sm font-medium text-error-700">Upload failed</p>
                  <p className="text-xs text-error-600">{error}</p>
                  <p className="text-xs text-gray-500">Click or drag to try again</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-sm font-medium text-gray-900">
                    {isDragActive ? 'Drop CSV file here' : 'Click or drag CSV file here'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Maximum file size: 5MB
                  </p>
                </div>
              )}
            </div>

            {uploadedData && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium text-gray-900">Preview</h4>
                  <Button
                    variant="primary"
                    onClick={handleCreatePayroll}
                  >
                    Create Payroll Run
                  </Button>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Total Workers:</span>
                      <span className="ml-2">{uploadedData.summary.totalWorkers}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Total Amount:</span>
                      <span className="ml-2 font-mono">{formatUSDC(uploadedData.summary.totalAmount)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Chains:</span>
                      <div className="ml-2 flex flex-wrap gap-1 mt-1">
                        {uploadedData.summary.chains.map((chain: string) => (
                          <Badge key={chain} variant="info" size="sm">
                            {getChainDisplayName(chain as any)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Amount</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Chain</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {uploadedData.workers.slice(0, 5).map((worker: any, index: number) => (
                          <tr key={index}>
                            <td className="px-3 py-2">{worker.name}</td>
                            <td className="px-3 py-2">{worker.email}</td>
                            <td className="px-3 py-2 font-mono">{formatUSDC(worker.amount)}</td>
                            <td className="px-3 py-2">
                              <Badge variant="info" size="sm">
                                {getChainDisplayName(worker.chain)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        {uploadedData.workers.length > 5 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-2 text-center text-gray-500">
                              ... and {uploadedData.workers.length - 5} more workers
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
