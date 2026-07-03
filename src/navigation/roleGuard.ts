export function isStaffRole(role: string | undefined): boolean {
  return role === 'admin' || role === 'staff';
}

export function isPatronRole(role: string | undefined): boolean {
  return role === 'patron';
}

export function getStackForRole(
  role: string | null | undefined,
  isAuthenticated: boolean,
): 'Auth' | 'Staff' | 'Patron' {
  if (!isAuthenticated) return 'Auth';
  if (role === 'admin' || role === 'staff') return 'Staff';
  return 'Patron';
}
