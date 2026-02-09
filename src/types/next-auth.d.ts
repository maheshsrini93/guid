// Custom user type used across the app
export interface AppUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}
