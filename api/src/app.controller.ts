import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @Get('health')
  @ApiOkResponse({ schema: { example: { ok: true } } })
  health(): { ok: true } {
    return { ok: true };
  }
}
