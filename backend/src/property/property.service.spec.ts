import { Test, TestingModule } from '@nestjs/testing';
import { PropertyService } from './property.service';
import { getModelToken } from '@nestjs/mongoose';
import { Property } from 'src/schemas/property.schema';
import { Model } from 'mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockProperty = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Test Property',
  address: '123 Test Street',
  location: { lat: 40.7128, lng: -74.0060 },
  description: 'Test description',
  propertyType: 'residential',
  price: 500000,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPropertyModel = {
  new: jest.fn().mockResolvedValue(mockProperty),
  constructor: jest.fn().mockResolvedValue(mockProperty),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  exec: jest.fn(),
};

describe('PropertyService', () => {
  let service: PropertyService;
  let model: Model<Property>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyService,
        {
          provide: getModelToken(Property.name),
          useValue: mockPropertyModel,
        },
      ],
    }).compile();

    service = module.get<PropertyService>(PropertyService);
    model = module.get<Model<Property>>(getModelToken(Property.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new property', async () => {
      const createPropertyDto = {
        name: 'Test Property',
        address: '123 Test Street',
        location: { lat: 40.7128, lng: -74.0060 },
        description: 'Test description',
        propertyType: 'residential',
        price: 500000,
      };

      const mockSave = jest.fn().mockResolvedValue(mockProperty);
      mockPropertyModel.save = mockSave;

      // Mock the constructor to return an object with save method
      const mockInstance = {
        ...createPropertyDto,
        save: mockSave,
      };
      
      jest.spyOn(model, 'constructor' as any).mockImplementation(() => mockInstance);

      const result = await service.create(createPropertyDto);

      expect(result).toEqual(mockProperty);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw BadRequestException on duplicate property', async () => {
      const createPropertyDto = {
        name: 'Test Property',
        address: '123 Test Street',
        location: { lat: 40.7128, lng: -74.0060 },
      };

      const mockSave = jest.fn().mockRejectedValue({ code: 11000 });
      const mockInstance = {
        ...createPropertyDto,
        save: mockSave,
      };

      jest.spyOn(model, 'constructor' as any).mockImplementation(() => mockInstance);

      await expect(service.create(createPropertyDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated properties', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockProperty]),
      };

      mockPropertyModel.find.mockReturnValue(mockFind);
      mockPropertyModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result).toEqual({
        properties: [mockProperty],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockPropertyModel.find).toHaveBeenCalledWith({ isActive: true });
    });

    it('should apply filters correctly', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockPropertyModel.find.mockReturnValue(mockFind);
      mockPropertyModel.countDocuments.mockResolvedValue(0);

      await service.findAll({
        name: 'Test',
        propertyType: 'residential',
        minPrice: 100000,
        maxPrice: 800000,
        page: 1,
        limit: 10,
      });

      expect(mockPropertyModel.find).toHaveBeenCalledWith({
        isActive: true,
        name: { $regex: 'Test', $options: 'i' },
        propertyType: 'residential',
        price: { $gte: 100000, $lte: 800000 },
      });
    });
  });

  describe('findOne', () => {
    it('should return a property by id', async () => {
      mockPropertyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProperty),
      });

      const result = await service.findOne('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockProperty);
      expect(mockPropertyModel.findOne).toHaveBeenCalledWith({
        _id: '507f1f77bcf86cd799439011',
        isActive: true,
      });
    });

    it('should throw NotFoundException when property not found', async () => {
      mockPropertyModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid ID format', async () => {
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update a property', async () => {
      const updateDto = { name: 'Updated Property' };
      
      mockPropertyModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockProperty, ...updateDto }),
      });

      const result = await service.update('507f1f77bcf86cd799439011', updateDto);

      expect(result.name).toBe('Updated Property');
      expect(mockPropertyModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '507f1f77bcf86cd799439011', isActive: true },
        { $set: updateDto },
        { new: true, runValidators: true },
      );
    });

    it('should throw NotFoundException when property not found', async () => {
      mockPropertyModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update('507f1f77bcf86cd799439011', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a property', async () => {
      mockPropertyModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProperty),
      });

      const result = await service.remove('507f1f77bcf86cd799439011');

      expect(result).toEqual({ message: 'Property deleted successfully' });
      expect(mockPropertyModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '507f1f77bcf86cd799439011', isActive: true },
        { $set: { isActive: false } },
        { new: true },
      );
    });

    it('should throw NotFoundException when property not found', async () => {
      mockPropertyModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPropertyStats', () => {
    it('should return property statistics', async () => {
      mockPropertyModel.countDocuments
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8)  // active
        .mockResolvedValueOnce(2); // inactive

      mockPropertyModel.aggregate
        .mockResolvedValueOnce([
          { _id: 'residential', count: 5 },
          { _id: 'commercial', count: 3 },
        ])
        .mockResolvedValueOnce([{ _id: null, average: 750000 }]);

      const result = await service.getPropertyStats();

      expect(result).toEqual({
        total: 10,
        active: 8,
        inactive: 2,
        byType: {
          residential: 5,
          commercial: 3,
        },
        averagePrice: 750000,
      });
    });
  });
});