import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property, PropertyDocument } from 'src/schemas/property.schema';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
  ) {}

  async getAllProperties(): Promise<Property[]> {
    return this.propertyModel.find().exec();
  }

  async getPropertyById(id: string): Promise<Property> {
    const property = await this.propertyModel.findById(id);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  async createProperty(dto: CreatePropertyDto): Promise<Property> {
    const property = new this.propertyModel(dto);
    return property.save();
  }

  async updateProperty(id: string, dto: UpdatePropertyDto): Promise<Property> {
    const property = await this.propertyModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  async deleteProperty(id: string): Promise<{ message: string }> {
    const property = await this.propertyModel.findByIdAndDelete(id);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return { message: 'Property deleted successfully' };
  }
}
