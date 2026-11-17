import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { AppError, ErrorResponse } from '../common/errors';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { CursorQueryDto } from './dto/cursor-query.dto';
import { FeedPage, PostCard, PostsService } from './posts.service';

const idPipe = new ParseIntPipe({
  exceptionFactory: () =>
    new AppError('VALIDATION_FAILED', 400, 'id must be an integer', [{ field: 'id', constraints: ['isInt'] }]),
});

const Unauthenticated = ApiResponse({ status: 401, type: ErrorResponse, description: 'UNAUTHENTICATED' });
const Suspended = ApiResponse({ status: 403, type: ErrorResponse, description: 'ACCOUNT_SUSPENDED' });

@ApiTags('posts')
@Controller()
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Post('posts')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 201, type: PostCard })
  @ApiResponse({
    status: 400,
    type: ErrorResponse,
    description: 'VALIDATION_FAILED | POST_EMPTY | POST_MEDIA_INVALID (1–4 images or exactly 1 video, never mixed)',
  })
  @Unauthenticated
  @ApiResponse({ status: 403, type: ErrorResponse, description: 'MEDIA_NOT_OWNED | ACCOUNT_SUSPENDED' })
  @ApiResponse({ status: 409, type: ErrorResponse, description: 'MEDIA_ALREADY_ATTACHED' })
  create(@Body() dto: CreatePostDto, @CurrentUser() user: AuthUser): Promise<PostCard> {
    return this.posts.create(user, dto);
  }

  @Get('feed/home')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiTags('feed')
  @ApiResponse({
    status: 200,
    type: FeedPage,
    description: 'Posts by people I follow + mine, newest first. limit defaults to 10, max 50',
  })
  @ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_FAILED (cursor / limit)' })
  @Unauthenticated
  @Suspended
  homeFeed(@Query() query: CursorQueryDto, @CurrentUser() user: AuthUser): Promise<FeedPage> {
    return this.posts.homeFeed(user, query);
  }

  // Public (no JWT): the share-link page /p/[id].
  @Get('posts/:id/public')
  @ApiResponse({ status: 200, type: PostCard, description: 'Without likedByMe / repostedByMe' })
  @ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_FAILED (id)' })
  @ApiResponse({
    status: 404,
    type: ErrorResponse,
    description: 'NOT_FOUND (missing, hidden, or by a suspended author)',
  })
  findPublic(@Param('id', idPipe) id: number): Promise<PostCard> {
    return this.posts.findPublic(id);
  }

  @Get('posts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: PostCard })
  @ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_FAILED (id)' })
  @Unauthenticated
  @Suspended
  @ApiResponse({
    status: 404,
    type: ErrorResponse,
    description: 'NOT_FOUND (missing, or hidden / by a suspended author and you are not its author or an admin)',
  })
  findOne(@Param('id', idPipe) id: number, @CurrentUser() user: AuthUser): Promise<PostCard> {
    return this.posts.findOne(id, user);
  }

  @Delete('posts/:id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 204, description: 'Deleted, with its reposts, likes, comments and media files' })
  @ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_FAILED (id)' })
  @Unauthenticated
  @ApiResponse({
    status: 403,
    type: ErrorResponse,
    description: 'FORBIDDEN (not the author; admins hide instead) | ACCOUNT_SUSPENDED',
  })
  @ApiResponse({ status: 404, type: ErrorResponse, description: 'NOT_FOUND' })
  remove(@Param('id', idPipe) id: number, @CurrentUser() user: AuthUser): Promise<void> {
    return this.posts.remove(id, user);
  }
}
