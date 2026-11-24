export interface AttendanceInfo {
  opensAt: string; closesAt: string; open: boolean; isOrganizer: boolean;
  validatedAt: string | null; lockedUntil: string | null; codeExpiresAt: string | null;
  enrolled: number; confirmed: number; pending: number;
  participants: { id: string; displayName: string; validatedAt: string | null }[];
}
export interface IssuedPin { pin: string; expiresAt: string }
