export interface AdminUser {
  id: string;
  username: string;
  role: 'ADMIN';
  name: string;
  phoneNumber?: string;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
