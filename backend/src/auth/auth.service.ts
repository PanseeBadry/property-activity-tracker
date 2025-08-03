import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SalesRep, SalesRepDocument } from 'src/schemas/sales-rep.schema';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectModel(SalesRep.name)
    private salesRepModel: Model<SalesRepDocument>,
  ) {}

  async login(name: string) {
    const user = await this.salesRepModel.findOne({ name });

    if (!user) {
      throw new UnauthorizedException('SalesRep not found');
    }
    // console.log('User found:', user);
    const payload = { userId: user._id, name: user.name };
    const token = this.jwtService.sign(payload);
    user.isOnline = true;
    // user.lastOnline = null;
    await user.save();
    return {
      access_token: token,
      salesRep: user,
    };
  }

  async logout(repId: string) {
    const user = await this.salesRepModel.findById(repId);
    if (!user) {
      throw new UnauthorizedException('SalesRep not found');
    }
    console.log('User found for logout:', user);
    if (!user.isOnline) {
      throw new UnauthorizedException('SalesRep is not online');
    } else {
      user.isOnline = false;
      user.lastOnline = new Date();
      await user.save();
    }
    return { message: 'Logged out successfully' };
  }
}
