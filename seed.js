const mongoose = require('mongoose');

// Simple schemas for seeding
const SalesRepSchema = new mongoose.Schema({
  name: String,
  isOnline: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  lastOnline: { type: Date, default: null }
});

const PropertySchema = new mongoose.Schema({
  propertyName: String,
  address: String,
  location: {
    lat: Number,
    lng: Number
  }
});

const SalesRep = mongoose.model('SalesRep', SalesRepSchema);
const Property = mongoose.model('Property', PropertySchema);

async function seedData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/property-activity-tracker');
    
    // Clear existing data
    await SalesRep.deleteMany({});
    await Property.deleteMany({});
    
    console.log('🗑️  Cleared existing data');
    
    // Add sample sales reps
    const salesReps = await SalesRep.insertMany([
      { name: 'John Doe', score: 25 },
      { name: 'Jane Smith', score: 45 },
      { name: 'Bob Johnson', score: 80 },
      { name: 'Alice Wilson', score: 120 },
      { name: 'Mike Davis', score: 15 }
    ]);
    
    // Add sample properties
    const properties = await Property.insertMany([
      {
        propertyName: 'Sunset Villa',
        address: '123 Sunset Blvd, Los Angeles, CA',
        location: { lat: 34.0522, lng: -118.2437 }
      },
      {
        propertyName: 'Downtown Apartment',
        address: '456 Main St, New York, NY',
        location: { lat: 40.7128, lng: -74.0060 }
      },
      {
        propertyName: 'Beach House',
        address: '789 Ocean Ave, Miami, FL',
        location: { lat: 25.7617, lng: -80.1918 }
      },
      {
        propertyName: 'Mountain Cabin',
        address: '321 Pine St, Denver, CO',
        location: { lat: 39.7392, lng: -104.9903 }
      },
      {
        propertyName: 'City Loft',
        address: '654 Tech Ave, San Francisco, CA',
        location: { lat: 37.7749, lng: -122.4194 }
      }
    ]);
    
    console.log('✅ Sample data added successfully!');
    console.log(`📊 Created:
    - ${salesReps.length} sales representatives
    - ${properties.length} properties`);
    
    console.log('\n🎯 You can now:');
    console.log('1. Start the backend: npm run start:dev');
    console.log('2. Open http://localhost:3000 in your browser');
    console.log('3. Login with any of these names:');
    salesReps.forEach(rep => console.log(`   - ${rep.name}`));
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
  }
}

seedData();