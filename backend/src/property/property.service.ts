import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Property, PropertyDocument } from 'src/schemas/property.schema';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
  ) {}

  async create(createPropertyDto: CreatePropertyDto): Promise<Property> {
    try {
      const property = new this.propertyModel(createPropertyDto);
      return await property.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('Property with this name and address already exists');
      }
      throw new BadRequestException('Failed to create property: ' + error.message);
    }
  }

  async findAll(queryDto?: QueryPropertyDto): Promise<{
    properties: Property[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      name,
      address,
      propertyType,
      minPrice,
      maxPrice,
      lat,
      lng,
      radius,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto || {};

    // Build filter query
    const filter: FilterQuery<PropertyDocument> = { isActive: true };

    // Text-based filters
    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }

    if (address) {
      filter.address = { $regex: address, $options: 'i' };
    }

    if (propertyType) {
      filter.propertyType = propertyType;
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) {
        filter.price.$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        filter.price.$lte = maxPrice;
      }
    }

    // Geospatial filter (find properties within radius)
    if (lat !== undefined && lng !== undefined && radius !== undefined) {
      filter.location = {
        $geoWithin: {
          $centerSphere: [[lng, lat], radius / 6371], // radius in radians (6371 is Earth's radius in km)
        },
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute queries
    const [properties, total] = await Promise.all([
      this.propertyModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.propertyModel.countDocuments(filter),
    ]);

    return {
      properties,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Property> {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestException('Invalid property ID format');
    }

    const property = await this.propertyModel.findOne({ _id: id, isActive: true }).exec();
    
    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    return property;
  }

  async findByLocation(lat: number, lng: number, radius: number): Promise<Property[]> {
    return this.propertyModel
      .find({
        isActive: true,
        location: {
          $geoWithin: {
            $centerSphere: [[lng, lat], radius / 6371], // Convert km to radians
          },
        },
      })
      .exec();
  }

  async findNearby(lat: number, lng: number, maxDistance: number = 5000): Promise<Property[]> {
    return this.propertyModel
      .find({
        isActive: true,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            $maxDistance: maxDistance, // in meters
          },
        },
      })
      .exec();
  }

  async update(id: string, updatePropertyDto: UpdatePropertyDto): Promise<Property> {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestException('Invalid property ID format');
    }

    try {
      const property = await this.propertyModel
        .findOneAndUpdate(
          { _id: id, isActive: true },
          { $set: updatePropertyDto },
          { new: true, runValidators: true }
        )
        .exec();

      if (!property) {
        throw new NotFoundException(`Property with ID ${id} not found`);
      }

      return property;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update property: ' + error.message);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestException('Invalid property ID format');
    }

    // Soft delete by setting isActive to false
    const property = await this.propertyModel
      .findOneAndUpdate(
        { _id: id, isActive: true },
        { $set: { isActive: false } },
        { new: true }
      )
      .exec();

    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    return { message: 'Property deleted successfully' };
  }

  async hardDelete(id: string): Promise<{ message: string }> {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestException('Invalid property ID format');
    }

    const result = await this.propertyModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    return { message: 'Property permanently deleted' };
  }

  async getPropertyStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byType: { [key: string]: number };
    averagePrice: number;
  }> {
    const [
      total,
      active,
      inactive,
      typeStats,
      priceStats,
    ] = await Promise.all([
      this.propertyModel.countDocuments(),
      this.propertyModel.countDocuments({ isActive: true }),
      this.propertyModel.countDocuments({ isActive: false }),
      this.propertyModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$propertyType', count: { $sum: 1 } } },
      ]),
      this.propertyModel.aggregate([
        { $match: { isActive: true, price: { $exists: true, $gt: 0 } } },
        { $group: { _id: null, average: { $avg: '$price' } } },
      ]),
    ]);

    const byType: { [key: string]: number } = {};
    typeStats.forEach(stat => {
      byType[stat._id || 'unspecified'] = stat.count;
    });

    return {
      total,
      active,
      inactive,
      byType,
      averagePrice: priceStats[0]?.average || 0,
    };
  }

  // Legacy method for backward compatibility
  async getAllProperties(): Promise<Property[]> {
    const result = await this.findAll();
    return result.properties;
  }
}
