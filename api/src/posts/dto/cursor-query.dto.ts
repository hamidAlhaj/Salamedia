import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** `?cursor=<lastId>&limit=<n>` (CLAUDE.md §4.5). The default limit depends on the endpoint. */
export class CursorQueryDto {
  @ApiPropertyOptional({ description: 'The last id of the previous page; items have id < cursor' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  cursor?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
