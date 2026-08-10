
export enum DeviceType {
  LAPTOP = 'Laptop',
  MOBILE = 'Mobile Phone',
  TABLET = 'Tablet',
  DESKTOP = 'Desktop',
  OTHER = 'Other'
}

export interface HistoryEntry {
  id: string;
  assignee: string;
  date: string;
  notes?: string;
}

export interface Device {
  id: string;
  type: DeviceType;
  manufacturer: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyExpiry: string;
  handoverDate: string;
  assignedTo: string;
  status: 'Available' | 'Assigned' | 'Maintenance' | 'Retired';
  branch: string;
  notes?: string;
  history: HistoryEntry[];
}

export interface Branch {
  id: string;
  name: string;
  companyName: string;
  address: string;
}

export interface CloudPayload {
  devices: Device[];
  branches: Branch[];
  version: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalDevices: number;
  assignedDevices: number;
  expiringWarranty: number;
  typeDistribution: { name: string; value: number }[];
  branchDistribution: { name: string; value: number }[];
}
