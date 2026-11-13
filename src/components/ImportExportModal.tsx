import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCcw, 
  FileText,
  HelpCircle
} from 'lucide-react';
import { Task, Cleaner, ImportPreviewRow } from '../types';
import { 
  downloadTasksTemplate, 
  parseTasksFromExcel, 
  commitPreviewRowsToTasks, 
  exportAllDataToExcel, 
  exportBackupJSON,
  parseBackupJSON,
  SystemSnapshot
} from '../services/excelService';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  cleaners: Cleaner[];
  onImportComplete: (newTasks: Task[], updatedCleaners: Cleaner[]) => void;
  onResetData: () => void;
  onRestoreSnapshot?: (snapshot: SystemSnapshot) => void;
  companySettings?: any;
  userRole?: string;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  cleaners,
  onImportComplete,
  onResetData,
  onRestoreSnapshot,
  companySettings,
  userRole = 'admin',
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'restore'>('import');
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[] | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Snapshot Restore state
  const [snapshotPreview, setSnapshotPreview] = useState<SystemSnapshot | null>(null);
  const [snapshotFileName, setSnapshotFileName] = useState<string | null>(null);
  const [isRestoringSnapshot, setIsRestoringSnapshot] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);
    setImportSuccessMessage(null);

    try {
      const rows = await parseTasksFromExcel(file, cleaners);
      setPreviewRows(rows);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse the Excel file. Please ensure it is a valid .xlsx file.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = () => {
    if (!previewRows) return;
    const { newTasks, updatedCleaners } = commitPreviewRowsToTasks(previewRows, cleaners);
    onImportComplete(newTasks, updatedCleaners);
    setImportSuccessMessage(`Successfully imported ${newTasks.length} tasks!`);
    setPreviewRows(null);
  };

  const handleSnapshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);
    setImportSuccessMessage(null);
    setSnapshotFileName(file.name);

    try {
      const snapshot = await parseBackupJSON(file);
      setSnapshotPreview(snapshot);
    } catch (err: any) {
      setParseError(err.message || 'Failed to read JSON snapshot.');
      setSnapshotPreview(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmRestoreSnapshot = () => {
    if (!snapshotPreview) return;
    setIsRestoringSnapshot(true);
    try {
      onRestoreSnapshot?.(snapshotPreview);
      setImportSuccessMessage(
        `Snapshot restored successfully! Restored ${snapshotPreview.tasks.length} tasks and ${snapshotPreview.cleaners.length} cleaners.`
      );
      setSnapshotPreview(null);
      setSnapshotFileName(null);
    } catch (err: any) {
      setParseError(err.message || 'Failed to restore snapshot');
    } finally {
      setIsRestoringSnapshot(false);
    }
  };

  const isAdmin = userRole === 'admin' || userRole === 'manager';

  const validRowCount = previewRows?.filter((r) => r.isValid).length || 0;
  const errorRowCount = (previewRows?.length || 0) - validRowCount;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-neutral-900 rounded-2xl max-w-4xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-6"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFB509] flex items-center justify-center text-neutral-950 font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Excel Import & Export
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Bulk transfer tasks, cleaner schedules, and payroll records
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Import vs Export vs Snapshot Restore */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 px-6 pt-2 bg-neutral-50/40 dark:bg-neutral-800/20 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('import');
              setImportSuccessMessage(null);
            }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'import'
                ? 'border-[#FFB509] text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Import Excel (.xlsx)
          </button>
          <button
            onClick={() => {
              setActiveTab('export');
              setImportSuccessMessage(null);
            }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'export'
                ? 'border-[#FFB509] text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Export & Backup (.xlsx / .json)
          </button>
          <button
            onClick={() => {
              setActiveTab('restore');
              setImportSuccessMessage(null);
            }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'restore'
                ? 'border-[#FFB509] text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            1-Click Restore Snapshot (.json)
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'import' && (
            <div className="space-y-6">
              
              {/* Success Notification */}
              {importSuccessMessage && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold">{importSuccessMessage}</span>
                  </div>
                  <button
                    onClick={() => setImportSuccessMessage(null)}
                    className="text-xs underline font-semibold"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Upload Box & Template Download */}
              {!previewRows && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-amber-400 dark:hover:border-amber-500 rounded-2xl p-8 text-center transition-colors bg-neutral-50/50 dark:bg-neutral-800/30">
                    <UploadCloud className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Upload Cleaning Tasks Spreadsheet (.xlsx)
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
                      Select or drag & drop an Excel file. DBuzzingBees will auto-detect columns: Job Type, Address, Date, Times, Fix Hours, Rate, and Cleaner assignments.
                    </p>

                    <div className="mt-5 flex items-center justify-center gap-3">
                      <label className="cursor-pointer px-4 py-2 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-xs">
                        <span>Browse .xlsx File</span>
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={downloadTasksTemplate}
                        className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5 text-[#FFB509]" />
                        <span>Download Sample Template</span>
                      </button>
                    </div>

                    {isParsing && (
                      <p className="mt-4 text-xs font-semibold text-amber-600 animate-pulse">
                        Parsing Excel sheet and preparing preview...
                      </p>
                    )}
                  </div>

                  {parseError && (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{parseError}</span>
                    </div>
                  )}

                  <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5">
                    <p className="font-bold text-neutral-900 dark:text-white flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-[#FFB509]" />
                      Supported Column Headers in Excel:
                    </p>
                    <p>
                      <strong>Job Type</strong>, <strong>Address</strong> (required), <strong>Client Name</strong>, <strong>Client Phone</strong>, <strong>Client Email</strong>, <strong>Date</strong> (YYYY-MM-DD), <strong>Start Time</strong>, <strong>End Time</strong>, <strong>Fix Hours</strong>, <strong>Rate</strong>, <strong>Pay Type</strong>, <strong>Payment Term</strong>, <strong>Frequency</strong>, <strong>Assigned Cleaners</strong>, and <strong>Remarks</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Interactive Preview Table */}
              {previewRows && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                        Import Preview ({previewRows.length} rows found)
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Review the parsed tasks below. Click "Confirm Import" to apply.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-emerald-600">
                        {validRowCount} valid
                      </span>
                      {errorRowCount > 0 && (
                        <span className="text-xs font-semibold text-red-600">
                          {errorRowCount} errors
                        </span>
                      )}
                      <button
                        onClick={() => setPreviewRows(null)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmImport}
                        disabled={validRowCount === 0}
                        className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-xs disabled:opacity-50"
                      >
                        Confirm & Import {validRowCount} Tasks
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-100 dark:bg-neutral-800 text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400">
                        <tr>
                          <th className="py-2.5 px-3">Row</th>
                          <th className="py-2.5 px-3">Job Type</th>
                          <th className="py-2.5 px-3">Address</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Time</th>
                          <th className="py-2.5 px-3 text-right">Fix Hrs</th>
                          <th className="py-2.5 px-3 text-right">Rate</th>
                          <th className="py-2.5 px-3">Pay Type</th>
                          <th className="py-2.5 px-3">Payment Term</th>
                          <th className="py-2.5 px-3">Cleaners</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {previewRows.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 ${
                              !row.isValid ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                            }`}
                          >
                            <td className="py-2 px-3 font-mono text-[11px] text-neutral-500">
                              #{row.rowNumber}
                            </td>
                            <td className="py-2 px-3 font-semibold text-neutral-900 dark:text-white">
                              {row.jobType}
                            </td>
                            <td className="py-2 px-3 text-neutral-700 dark:text-neutral-300 max-w-[180px] truncate" title={row.address}>
                              {row.address || <span className="text-red-500 italic">Missing</span>}
                            </td>
                            <td className="py-2 px-3 font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                              {row.date}
                            </td>
                            <td className="py-2 px-3 font-mono text-neutral-500 whitespace-nowrap">
                              {row.startTime} – {row.endTime}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold">
                              {row.fixHour}h
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold">
                              ${row.rate}
                            </td>
                            <td className="py-2 px-3 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                              {row.payType === 'Fixed Price' ? 'Fixed Price' : 'Hourly Rate'}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                row.paymentTerm === 'Cash'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              }`}>
                                {row.paymentTerm || 'Invoice'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-neutral-600 dark:text-neutral-400 max-w-[140px] truncate">
                              {row.assignedCleaners.join(', ') || <span className="text-neutral-400 italic">None</span>}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              {row.isValid ? (
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                                </span>
                              ) : (
                                <span className="text-[11px] font-semibold text-red-600 flex items-center gap-1" title={row.errors.join(', ')}>
                                  <AlertCircle className="w-3.5 h-3.5" /> Error
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full Workbook Export */}
                <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-[#FFB509]" />
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Complete Excel Workbook (.xlsx)
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Exports all tasks, cleaners directory, and financial summaries into a formatted multi-sheet Excel spreadsheet.
                  </p>
                  <button
                    onClick={() => exportAllDataToExcel(tasks, cleaners)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[#FFB509] hover:bg-[#EAA300] text-neutral-950 transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Complete Workbook</span>
                  </button>
                </div>

                {/* JSON Full System Snapshot Export */}
                <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      System Snapshot Backup (.json)
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Complete, self-contained offline JSON snapshot of tasks, schedules, cleaner roster, and company templates. 100% free; zero cloud subscriptions.
                  </p>
                  <button
                    onClick={() => exportBackupJSON(tasks, cleaners, companySettings)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Complete System Snapshot</span>
                  </button>
                </div>

              </div>

              {/* Production Database Clear & Reset Section (Restricted to Administrators) */}
              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
                  <div>
                    <h4 className="text-xs font-bold text-red-900 dark:text-red-300 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span>Clear All Client & Cleaner Records (Clean Slate)</span>
                    </h4>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                      Deletes all existing tasks, schedules, and cleaner profiles from the database for a clean production start. Staff accounts remain intact.
                    </p>
                  </div>
                  {isAdmin ? (
                    <button
                      onClick={() => {
                        onResetData();
                        onClose();
                      }}
                      className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors shadow-xs"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      <span>Clear All Data</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-neutral-400 italic">Admin only</span>
                  )}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'restore' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Zero-Cost Offline Disaster Recovery</h4>
                  <p className="mt-0.5 text-neutral-600 dark:text-neutral-300 text-[11.5px]">
                    Restore all your cleaning schedules, clients, cleaner roster, and business configurations from any previously exported <code className="font-mono bg-white dark:bg-neutral-800 px-1 py-0.5 rounded">.json</code> snapshot without needing paid cloud backup add-ons.
                  </p>
                </div>
              </div>

              {!isAdmin ? (
                <div className="p-8 text-center bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                  <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                    Administrator Access Required
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    System snapshot restorations can only be performed by Managers or Administrators.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Upload Dropzone */}
                  <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-6 sm:p-8 text-center hover:border-[#FFB509] transition-colors bg-neutral-50/50 dark:bg-neutral-800/30">
                    <input
                      type="file"
                      id="snapshot-file-upload"
                      accept=".json,application/json"
                      onChange={handleSnapshotUpload}
                      className="hidden"
                    />
                    <label htmlFor="snapshot-file-upload" className="cursor-pointer block">
                      <UploadCloud className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                      <span className="text-sm font-bold text-neutral-900 dark:text-white block">
                        {snapshotFileName || 'Choose or drop a DBuzzingBees Snapshot (.json)'}
                      </span>
                      <span className="text-xs text-neutral-500 block mt-1">
                        Select a .json file exported from DBuzzingBees
                      </span>
                    </label>
                  </div>

                  {isParsing && (
                    <div className="text-center py-4 text-xs font-semibold text-neutral-600 dark:text-neutral-300 flex items-center justify-center gap-2">
                      <RefreshCcw className="w-4 h-4 animate-spin text-[#FFB509]" />
                      <span>Validating snapshot structure...</span>
                    </div>
                  )}

                  {parseError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{parseError}</span>
                    </div>
                  )}

                  {importSuccessMessage && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{importSuccessMessage}</span>
                    </div>
                  )}

                  {snapshotPreview && (
                    <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/60 space-y-4 shadow-xs animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-700 pb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                            Valid Snapshot Ready to Restore
                          </h4>
                        </div>
                        <span className="text-[11px] font-mono text-neutral-500">
                          Format v{snapshotPreview.version}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
                          <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Tasks / Jobs</span>
                          <span className="text-lg font-bold text-neutral-900 dark:text-white font-mono-numbers">
                            {snapshotPreview.tasks.length}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
                          <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Cleaners</span>
                          <span className="text-lg font-bold text-neutral-900 dark:text-white font-mono-numbers">
                            {snapshotPreview.cleaners.length}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
                          <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Settings</span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                            {snapshotPreview.companySettings ? 'Included' : 'None'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800">
                          <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Export Date</span>
                          <span className="text-[11px] font-mono text-neutral-700 dark:text-neutral-300 block mt-1 truncate" title={snapshotPreview.exportedAt}>
                            {snapshotPreview.exportedAt.split('T')[0]}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSnapshotPreview(null);
                            setSnapshotFileName(null);
                          }}
                          className="px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isRestoringSnapshot}
                          onClick={handleConfirmRestoreSnapshot}
                          className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center gap-1.5"
                        >
                          {isRestoringSnapshot ? (
                            <>
                              <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                              <span>Restoring Database...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Confirm & Restore Snapshot</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
