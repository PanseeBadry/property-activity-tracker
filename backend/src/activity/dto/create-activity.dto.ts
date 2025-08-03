export class CreateActivityDto {
  propertyId: string;
  activityType: 'visit' | 'call' | 'inspection' | 'follow-up' | 'note';
  timestamp: Date;
  location: {
    lat: number;
    lng: number;
  };
  note?: string;
}
