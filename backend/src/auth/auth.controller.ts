import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { CreateSalesRepDto } from 'src/sales-rep/dto/create-sales-rep.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login or register sales rep by name' })
  @ApiBody({ type: CreateSalesRepDto })
  @ApiResponse({
    status: 200,
    description: 'Returns JWT token and user info',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'jwt.token.string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            name: { type: 'string', example: 'Alice' },
            score: { type: 'number', example: 42 },
          },
        },
      },
    },
  })
  async login(@Body() dto: CreateSalesRepDto) {
    return this.authService.login(dto.name);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Logout current user' })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiResponse({ status: 200, description: 'User logged out successfully' })
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.userId);
  }
}
