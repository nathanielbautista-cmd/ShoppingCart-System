/**
 * Admin Authentication Service
 *
 * Mock authentication for frontend testing.
 * Real backend JWT/session authentication will be wired in future backend phase.
 */

export interface AdminUser {
  username: string;
  role: 'ADMIN' | 'STORE_MANAGER';
  name: string;
}

export function validateAdminCredentials(user: string, pass: string): { success: boolean; user?: AdminUser; error?: string } {
  const cleanUser = user.trim().toLowerCase();
  const cleanPass = pass.trim();
  const accounts: Record<string, { password: string; name: string }> = {
    admin: { password: 'admin123', name: 'System Administrator' },
    cartadmin: { password: '1234', name: 'System Administrator' },
  };

  if (!cleanUser) {
    return { success: false, error: 'Username is required.' };
  }

  if (!cleanPass) {
    return { success: false, error: 'Password is required.' };
  }

  const account = accounts[cleanUser];
  if (!account) {
    return { success: false, error: 'User not found. Check your username and try again.' };
  }

  if (cleanPass !== account.password) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  return {
    success: true,
    user: {
      username: cleanUser,
      role: 'ADMIN',
      name: account.name,
    },
  };
}
