import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AppError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 10;
// Compared against when the user does not exist, so unknown users take as long as wrong passwords.
const DUMMY_HASH = bcrypt.hashSync('salamedia-timing-dummy', BCRYPT_ROUNDS);

export class AuthResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' }) accessToken!: string;
  @ApiProperty({ type: SafeUser }) user!: SafeUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    // A duplicate email/username raises P2002, mapped to EMAIL_TAKEN / USERNAME_TAKEN by the filter.
    const user = await this.prisma.user.create({
      data: { name: dto.name, username: dto.username, email: dto.email, passwordHash },
    });
    return { accessToken: await this.sign(user.id), user: this.users.toSafeUser(user) };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const where = dto.identifier.includes('@')
      ? { email: dto.identifier }
      : { username: dto.identifier };
    const user = await this.prisma.user.findUnique({ where });

    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid credentials');
    if (user.status === 'SUSPENDED') throw new AppError('ACCOUNT_SUSPENDED', 403, 'Account suspended');

    return { accessToken: await this.sign(user.id), user: this.users.toSafeUser(user) };
  }

  async me(userId: number): Promise<SafeUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new AppError('UNAUTHENTICATED', 401, 'Authentication required');
    return this.users.toSafeUser(user);
  }

  private sign(userId: number): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }
}
