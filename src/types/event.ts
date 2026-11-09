export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export interface EventInput {
  organizerId: string;
  categoryId: string;
  title: string;
  description: string;
  locationName: string;
  address: string | null;
  meetingDetails: string | null;
  latitude: number;
  longitude: number;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  price: number;
  currency: string;
  capacity: number | null;
  status: EventStatus;
}

export interface EventRecord extends EventInput {
  id: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDetail extends EventRecord {
  categoryName: string;
  organizer: { id: string; displayName: string };
  participants: import('./activity').ActivityParticipant[];
  participantCount: number;
  availableSpots: number | null;
  viewer: { isOrganizer: boolean; isJoined: boolean };
}

export type PublishActivityInput = Omit<EventInput, 'organizerId' | 'status'>;
