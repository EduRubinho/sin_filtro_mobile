export interface MapActivity {
  id: string; title: string; description: string; locationName: string; categoryName: string;
  latitude: number; longitude: number; startsAt: string; endsAt: string; timeZone: string;
  price: number; currency: string; distanceMeters: number;
}
export interface MapActivities { activities: MapActivity[]; hasMore: boolean }

export interface ActivityParticipant {
  id: string;
  displayName: string;
  joinedAt: string;
}

export type UserPlanStatus = 'published' | 'cancelled' | 'completed';
export type UserPlanRelation = 'organizer' | 'participant';

export interface UserPlan {
  id: string;
  title: string;
  locationName: string;
  categoryName: string;
  startsAt: string;
  endsAt: string;
  status: UserPlanStatus;
  capacity: number | null;
  participantCount: number;
  relation: UserPlanRelation;
  chatAvailable: boolean;
  chatReadOnly: boolean;
  unreadCount: number;
}

export interface UserPlans {
  organized: UserPlan[];
  participating: UserPlan[];
}
