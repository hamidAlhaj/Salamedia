import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RepostDto {
  @ApiPropertyOptional({
    example: 'لازم الكل يشوف هالشي',
    maxLength: 2000,
    description: 'Optional quote, trimmed (blank = plain repost). Reposts never carry media.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  body?: string;
}
