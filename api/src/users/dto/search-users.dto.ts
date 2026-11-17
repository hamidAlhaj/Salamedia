import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class SearchUsersDto {
  @ApiProperty({ example: 'ra', minLength: 1, maxLength: 50, description: 'Trimmed; matches username or name' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 50)
  q!: string;
}
