export class CreateActivityDto {
  propertyId: string;
  activityType: string;
  timestamp: Date;
  location: {
    lat: number;
    lng: number;
  };
  note?: string;
  weight: number;
}
