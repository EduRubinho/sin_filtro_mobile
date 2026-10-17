export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  profile: Profile;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface Session {
  token: string;
  expiresAt: string;
  user: User;
}

export interface ProfileInput {
  displayName: string;
  bio: string;
  interestIds: string[];
}
export interface Profile extends Omit<ProfileInput, 'displayName'> {
  displayName: string | null;
  completed: boolean;
}
export interface Category { id: string; name: string; slug: string }
