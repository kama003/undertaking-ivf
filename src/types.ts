
export type DocumentStatus = 'GENERATED' | 'PRINTED' | 'NOTARISED' | 'SCANNED' | 'STORED';

export interface UndertakingData {
  id: string; // Unique Document ID (for QR)
  uhid: string;
  hospitalName: string;
  patientName?: string; // Optional if toggle is off
  wifeName?: string;
  husbandName?: string;
  wifeAadhar?: string;
  husbandAadhar?: string;
  status: DocumentStatus;
  useDetailedFormat: boolean;
  generatedDate: string;
}

export interface ProcessingState {
  isGenerating: boolean;
  isSplitting: boolean;
  uploadProgress: number;
}

export type UserRole = 'admin' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface SalesRecord {
  id: string; // Unique ID (e.g. monthKey_uhid_date)
  monthKey: string; // e.g. "2026-04" for April 2026
  uhid: string; // Maps to DONOR NUMBER
  dateIssued: string; // Maps to DATE ISSUED
  serialNumber?: string;
  batchNo?: string;
  vialsIssued?: string | number;
  artClinic?: string;
  // Note: Notarised status is derived from Undertaking data
}

export interface SalesMonth {
  monthKey: string; // "2026-04"
  isLocked: boolean;
  updatedAt: string;
}

