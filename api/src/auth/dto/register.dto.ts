import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @ApiProperty({ example: 'ليلى الحسن', minLength: 2, maxLength: 50 })
  @Transform(trim)
  @IsString()
  @Length(2, 50)
  name!: string;

  @ApiProperty({ example: 'layla', pattern: '^[a-z0-9_]{3,20}$', description: 'Trimmed and lowercased' })
  @Transform(trimLower)
  @IsString()
  @Matches(/^[a-z0-9_]{3,20}$/)
  username!: string;

  @ApiProperty({ example: 'layla@example.com', description: 'Trimmed and lowercased' })
  @Transform(trimLower)
  @IsString()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Password123!', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt only uses the first 72 bytes
  password!: string;
}
