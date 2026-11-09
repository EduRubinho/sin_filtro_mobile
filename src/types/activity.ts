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
