export interface User {
  id: string;
  email: string;
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
