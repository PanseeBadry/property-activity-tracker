export class UpdateActivityDto {
  activityType?: string;
  timestamp?: Date;
  propertyId?: string;
  location?: {
    lat: number;
    lng: number;
  };
}
