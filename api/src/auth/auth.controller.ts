import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { ErrorResponse } from '../common/errors';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { AuthResponse, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiResponse({ status: 201, type: AuthResponse })
  @ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_FAILED' })
  @ApiResponse({ status: 409, type: ErrorResponse, description: 'EMAIL_TAKEN | USERNAME_TAKEN' })
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: AuthResponse })
  @ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_FAILED' })
  @ApiResponse({ status: 401, type: ErrorResponse, description: 'INVALID_CREDENTIALS' })
  @ApiResponse({ status: 403, type: ErrorResponse, description: 'ACCOUNT_SUSPENDED' })
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: SafeUser })
  @ApiResponse({ status: 401, type: ErrorResponse, description: 'UNAUTHENTICATED' })
  @ApiResponse({ status: 403, type: ErrorResponse, description: 'ACCOUNT_SUSPENDED' })
  me(@CurrentUser() user: AuthUser): Promise<SafeUser> {
    return this.auth.me(user.id);
  }
}
