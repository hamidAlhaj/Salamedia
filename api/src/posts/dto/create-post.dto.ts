import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreatePostDto {
  @ApiPropertyOptional({ example: 'صباح الخير من سلمية ☀️', maxLength: 2000, description: 'Trimmed' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  body?: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description:
      'Pending media ids from POST /media/*, in display order: 1–4 images or exactly 1 video. ' +
      'More than 4 (or a mix) is 400 POST_MEDIA_INVALID; more than 10 ids is rejected as VALIDATION_FAILED.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('all', { each: true })
  mediaIds?: string[];
}
