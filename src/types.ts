
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

