import { Injectable } from '@nestjs/common';
import { PropertyService } from './property.service';
import { CreatePropertyDto } from './dto/create-property.dto';

@Injectable()
export class PropertySeederService {
  constructor(private readonly propertyService: PropertyService) {}

  async seedSampleProperties(): Promise<void> {
    const sampleProperties: CreatePropertyDto[] = [
      {
        name: 'Downtown Office Complex',
        address: '123 Main Street, Downtown, City',
        location: { lat: 40.7128, lng: -74.0060 },
        description: 'Modern office complex in the heart of downtown',
        propertyType: 'commercial',
        price: 2500000,
      },
      {
        name: 'Suburban Family Home',
        address: '456 Oak Avenue, Suburbs, City',
        location: { lat: 40.7589, lng: -73.9851 },
        description: '4-bedroom family home with large backyard',
        propertyType: 'residential',
        price: 750000,
      },
      {
        name: 'Industrial Warehouse',
        address: '789 Factory Road, Industrial District',
        location: { lat: 40.6892, lng: -74.0445 },
        description: 'Large warehouse facility with loading docks',
        propertyType: 'industrial',
        price: 1200000,
      },
      {
        name: 'Waterfront Condo',
        address: '321 Harbor View, Waterfront District',
        location: { lat: 40.7505, lng: -73.9934 },
        description: 'Luxury waterfront condominium with stunning views',
        propertyType: 'residential',
        price: 950000,
      },
      {
        name: 'Retail Shopping Plaza',
        address: '654 Commerce Street, Shopping District',
        location: { lat: 40.7282, lng: -73.7949 },
        description: 'Prime retail space in busy shopping area',
        propertyType: 'commercial',
        price: 1800000,
      },
      {
        name: 'Historic Brownstone',
        address: '987 Heritage Lane, Historic District',
        location: { lat: 40.7831, lng: -73.9712 },
        description: 'Beautifully restored 19th century brownstone',
        propertyType: 'residential',
        price: 1100000,
      },
      {
        name: 'Tech Startup Hub',
        address: '147 Innovation Drive, Tech District',
        location: { lat: 40.7416, lng: -74.0097 },
        description: 'Modern co-working space for tech companies',
        propertyType: 'commercial',
        price: 3200000,
      },
      {
        name: 'Vacant Development Land',
        address: 'Future Development Blvd, Outskirts',
        location: { lat: 40.6978, lng: -73.9442 },
        description: '50-acre plot ready for development',
        propertyType: 'land',
        price: 500000,
      },
      {
        name: 'Luxury Penthouse',
        address: '555 Skyline Avenue, Uptown',
        location: { lat: 40.7829, lng: -73.9654 },
        description: 'Top-floor penthouse with panoramic city views',
        propertyType: 'residential',
        price: 2800000,
      },
      {
        name: 'Medical Office Building',
        address: '222 Health Plaza, Medical District',
        location: { lat: 40.7614, lng: -73.9776 },
        description: 'Specialized medical office space near hospitals',
        propertyType: 'commercial',
        price: 1600000,
      },
    ];

    console.log('Seeding sample properties...');
    
    for (const propertyData of sampleProperties) {
      try {
        await this.propertyService.create(propertyData);
        console.log(`✓ Created property: ${propertyData.name}`);
      } catch (error) {
        console.log(`✗ Failed to create property: ${propertyData.name} - ${error.message}`);
      }
    }

    console.log('Property seeding completed!');
  }

  async clearAllProperties(): Promise<void> {
    console.log('Clearing all properties...');
    // Note: This would require a method in PropertyService to clear all
    // For now, this is a placeholder
    console.log('Property clearing completed!');
  }
}