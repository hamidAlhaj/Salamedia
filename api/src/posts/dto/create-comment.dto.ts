import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCommentDto {
  @ApiProperty({ example: 'صور حلوة كتير 👌', minLength: 1, maxLength: 500, description: 'Trimmed; 1–500 characters' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  body!: string;
}
