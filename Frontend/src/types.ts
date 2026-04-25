export type UserRole = 'REPORTER' | 'NGO_ADMIN' | 'VOLUNTEER' | 'GOVERNMENT' | 'SUPER_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  organization?: string;
}

export interface EmergencyReport {
  id: string;
  type: 'FOOD' | 'RESCUE' | 'MEDICAL' | 'SHELTER' | 'WATER' | 'EDUCATION';
  severity: 1 | 2 | 3 | 4 | 5;
  location: { lat: number; lng: number; address: string };
  peopleCount: number;
  description: string;
  status: 'RECEIVED' | 'PROCESSING' | 'ASSIGNED' | 'ON_ROUTE' | 'RESOLVED';
  createdAt: string;
  priorityScore: number;
}
