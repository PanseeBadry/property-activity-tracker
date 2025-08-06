# Property Management API

## Overview
The Property module provides comprehensive CRUD operations for managing real estate properties with advanced search, filtering, and geospatial capabilities.

## Features
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Advanced filtering and search
- ✅ Geospatial queries (nearby properties, location-based search)
- ✅ Pagination and sorting
- ✅ Soft delete functionality
- ✅ Property statistics
- ✅ Sample data seeding
- ✅ Input validation with DTOs
- ✅ Comprehensive unit tests

## API Endpoints

### Base URL: `/properties`

#### 1. Create Property
- **POST** `/properties`
- **Auth Required**: JWT Token
- **Body**:
```json
{
  "name": "Downtown Office Complex",
  "address": "123 Main Street, Downtown, City",
  "location": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "description": "Modern office complex",
  "propertyType": "commercial",
  "price": 2500000
}
```

#### 2. Get All Properties (with filtering and pagination)
- **GET** `/properties`
- **Query Parameters**:
  - `name` - Filter by property name
  - `address` - Filter by address
  - `propertyType` - Filter by type (residential, commercial, industrial, land)
  - `minPrice` - Minimum price filter
  - `maxPrice` - Maximum price filter
  - `lat`, `lng`, `radius` - Geospatial search within radius (km)
  - `page` - Page number (default: 1)
  - `limit` - Items per page (default: 10, max: 100)
  - `sortBy` - Sort field (default: createdAt)
  - `sortOrder` - Sort direction (asc/desc, default: desc)

**Example**: `/properties?propertyType=residential&minPrice=500000&page=1&limit=5`

#### 3. Get Property by ID
- **GET** `/properties/:id`
- **Example**: `/properties/507f1f77bcf86cd799439011`

#### 4. Update Property
- **PUT** `/properties/:id`
- **Auth Required**: JWT Token
- **Body**: Partial property object (same as create, all fields optional)

#### 5. Delete Property (Soft Delete)
- **DELETE** `/properties/:id`
- **Auth Required**: JWT Token
- Sets `isActive: false` instead of removing from database

#### 6. Hard Delete Property
- **DELETE** `/properties/:id/hard`
- **Auth Required**: JWT Token
- Permanently removes property from database

#### 7. Get Property Statistics
- **GET** `/properties/stats`
- **Auth Required**: JWT Token
- **Response**:
```json
{
  "total": 100,
  "active": 85,
  "inactive": 15,
  "byType": {
    "residential": 45,
    "commercial": 30,
    "industrial": 8,
    "land": 2
  },
  "averagePrice": 850000
}
```

#### 8. Find Nearby Properties
- **GET** `/properties/nearby?lat=40.7128&lng=-74.0060&maxDistance=5000`
- **Query Parameters**:
  - `lat` - Latitude (required)
  - `lng` - Longitude (required)
  - `maxDistance` - Maximum distance in meters (default: 5000)

#### 9. Find Properties by Location (Radius Search)
- **GET** `/properties/search/location?lat=40.7128&lng=-74.0060&radius=10`
- **Query Parameters**:
  - `lat` - Latitude (required)
  - `lng` - Longitude (required)
  - `radius` - Search radius in kilometers (required)

#### 10. Seed Sample Properties
- **POST** `/properties/seed`
- Populates database with 10 sample properties for testing

#### 11. Legacy Endpoint (Backward Compatibility)
- **GET** `/properties/legacy/all`
- Returns all active properties without pagination

## Property Schema

```typescript
{
  name: string;              // Required
  address: string;           // Required
  location: {                // Required
    lat: number;
    lng: number;
  };
  description?: string;      // Optional
  propertyType?: string;     // Optional: residential, commercial, industrial, land, other
  price?: number;           // Optional, minimum: 0
  isActive: boolean;        // Default: true
  createdAt: Date;          // Auto-generated
  updatedAt: Date;          // Auto-generated
}
```

## Error Responses

### Validation Errors (400)
```json
{
  "statusCode": 400,
  "message": ["name should not be empty", "location.lat must be a number"],
  "error": "Bad Request"
}
```

### Not Found (404)
```json
{
  "statusCode": 404,
  "message": "Property with ID 507f1f77bcf86cd799439011 not found",
  "error": "Not Found"
}
```

### Unauthorized (401)
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

## Testing
Run unit tests with:
```bash
npm run test -- property.service.spec.ts
```

## Geospatial Features
The Property module includes MongoDB geospatial indexing for efficient location-based queries:
- 2dsphere index on location field
- Nearby searches using `$near` operator
- Radius searches using `$geoWithin` operator

## Sample Usage

### Create a property
```bash
curl -X POST http://localhost:3000/properties \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Property",
    "address": "123 Test St",
    "location": {"lat": 40.7128, "lng": -74.0060},
    "propertyType": "residential",
    "price": 500000
  }'
```

### Search properties
```bash
# Get residential properties under $800k
curl "http://localhost:3000/properties?propertyType=residential&maxPrice=800000"

# Find properties within 5km of a location
curl "http://localhost:3000/properties/search/location?lat=40.7128&lng=-74.0060&radius=5"
```