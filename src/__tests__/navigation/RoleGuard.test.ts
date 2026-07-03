import { isStaffRole, isPatronRole, getStackForRole } from '../../navigation/roleGuard';

describe('RoleGuard', () => {
  describe('isStaffRole', () => {
    it('returns true for admin', () => {
      expect(isStaffRole('admin')).toBe(true);
    });

    it('returns true for staff', () => {
      expect(isStaffRole('staff')).toBe(true);
    });

    it('returns false for patron', () => {
      expect(isStaffRole('patron')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isStaffRole(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isStaffRole('')).toBe(false);
    });
  });

  describe('isPatronRole', () => {
    it('returns true for patron', () => {
      expect(isPatronRole('patron')).toBe(true);
    });

    it('returns false for admin', () => {
      expect(isPatronRole('admin')).toBe(false);
    });

    it('returns false for staff', () => {
      expect(isPatronRole('staff')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isPatronRole(undefined)).toBe(false);
    });
  });

  describe('getStackForRole', () => {
    it('returns Auth when not authenticated', () => {
      expect(getStackForRole(null, false)).toBe('Auth');
    });

    it('returns Auth when authenticated is false', () => {
      expect(getStackForRole('patron', false)).toBe('Auth');
    });

    it('returns Staff for admin', () => {
      expect(getStackForRole('admin', true)).toBe('Staff');
    });

    it('returns Staff for staff', () => {
      expect(getStackForRole('staff', true)).toBe('Staff');
    });

    it('returns Patron for patron', () => {
      expect(getStackForRole('patron', true)).toBe('Patron');
    });
  });

  describe('navigator guard logic', () => {
    it('staff user is blocked from patron stack', () => {
      const allowedInPatronStack = isPatronRole('staff');
      expect(allowedInPatronStack).toBe(false);
    });

    it('patron user is blocked from staff stack', () => {
      const allowedInStaffStack = isStaffRole('patron');
      expect(allowedInStaffStack).toBe(false);
    });
  });
});
