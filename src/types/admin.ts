import type { User } from './auth';
export interface AdminUser extends User {
  role: 'user';
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
}
