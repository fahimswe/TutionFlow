export const appInfo = {
  name: 'TutionFlow',
  version: '0.1.0',
  platform: 'cross-platform tuition management',
};

export type UserRole = 'admin' | 'tutor' | 'student' | 'parent';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
