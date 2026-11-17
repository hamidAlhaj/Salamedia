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
import { CreateCommentDto } from './dto/create-comment.dto';
import { CursorQueryDto } from './dto/cursor-query.dto';
import { RepostDto } from './dto/repost.dto';
import { CommentItem, CommentPage, FeedPage, LikeResult, PostCard, PostsService } from './posts.service';

const idPipe = new ParseIntPipe({
  exceptionFactory: () =>
    new AppError('VALIDATION_FAILED', 400, 'id must be an integer', [{ field: 'id', constraints: ['isInt'] }]),
});

const Unauthenticated = ApiResponse({ status: 401, type: ErrorResponse, description: 'UNAUTHENTICATED' });
const Suspended = ApiResponse({ status: 403, type: ErrorResponse, description: 'ACCOUNT_SUSPENDED' });
const NotVisible = ApiResponse({
  status: 404,
  type: ErrorResponse,
  description: 'NOT_FOUND (missing, hidden, or by a suspended author, and you are not its author or an admin)',
});

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

  // ───────────── likes ─────────────

  @Post('posts/:id/like')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiTags('engagement')
  @ApiResponse({ status: 200, type: LikeResult, description: 'Idempotent: liking twice keeps one like' })
  @ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_FAILED (id)' })
  @Unauthenticated
  @Suspended
  @NotVisible
  like(@Param('id', idPipe) id: number, @CurrentUser() user: AuthUser): Promise<LikeResult> {
    return this.posts.like(id, user);
  }

  @Delete('posts/:id/like')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiTags('engagement')
  @ApiResponse({ status: 200, type: LikeResult, description: 'Idempotent: unliking twice is fine' })
  @ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_FAILED (id)' })
  @Unauthenticated
  @Suspended
  @NotVisible
  unlike(@Param('id', idPipe) id: number, @CurrentUser() user: AuthUser): Promise<LikeResult> {
    return this.posts.unlike(id, user);
  }

  // ───────────── comments ─────────────

  @Get('posts/:id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiTags('engagement')
  @ApiResponse({
    status: 200,
    type: CommentPage,
    description: 'Newest first. limit defaults to 20, max 50. Hidden comments only for their author and admins',
  })
  @ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_FAILED (id / cursor / limit)' })
  @Unauthenticated
  @Suspended
  @NotVisible
  comments(
    @Param('id', idPipe) id: number,
    @Query() query: CursorQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommentPage> {
    return this.posts.comments(id, user, query);
  }

  @Post('posts/:id/comments')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiTags('engagement')
  @ApiResponse({ status: 201, type: CommentItem })
  @ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_FAILED (blank or longer than 500)' })
  @Unauthenticated
  @Suspended
  @NotVisible
  addComment(
    @Param('id', idPipe) id: number,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommentItem> {
    return this.posts.addComment(id, user, dto);
  }

  @Delete('comments/:id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiTags('engagement')
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_FAILED (id)' })
  @Unauthenticated
  @ApiResponse({
    status: 403,
    type: ErrorResponse,
    description: 'FORBIDDEN (neither the comment author nor the post author) | ACCOUNT_SUSPENDED',
  })
  @ApiResponse({ status: 404, type: ErrorResponse, description: 'NOT_FOUND (missing, or not visible to you)' })
  removeComment(@Param('id', idPipe) id: number, @CurrentUser() user: AuthUser): Promise<void> {
    return this.posts.removeComment(id, user);
  }

  // ───────────── reposts ─────────────

  @Post('posts/:id/repost')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiTags('engagement')
  @ApiResponse({
    status: 201,
    type: PostCard,
    description: 'The new repost. If :id is itself a repost, the new row points to its original',
  })
  @ApiResponse({
    status: 400,
    type: ErrorResponse,
    description: 'VALIDATION_FAILED (quote longer than 2000) | CANNOT_REPOST (your own post)',
  })
  @Unauthenticated
  @Suspended
  @NotVisible
  @ApiResponse({ status: 409, type: ErrorResponse, description: 'ALREADY_REPOSTED' })
  repost(
    @Param('id', idPipe) id: number,
    @Body() dto: RepostDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PostCard> {
    return this.posts.repost(id, user, dto);
  }

  @Delete('posts/:id/repost')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiTags('engagement')
  @ApiResponse({ status: 204, description: 'My repost of that original was removed (:id may be the original or a repost of it)' })
  @ApiResponse({ status: 400, type: ErrorResponse, description: 'VALIDATION_FAILED (id)' })
  @Unauthenticated
  @Suspended
  @ApiResponse({
    status: 404,
    type: ErrorResponse,
    description: 'NOT_FOUND (post not visible, or you have not reposted it)',
  })
  unrepost(@Param('id', idPipe) id: number, @CurrentUser() user: AuthUser): Promise<void> {
    return this.posts.unrepost(id, user);
  }
}
