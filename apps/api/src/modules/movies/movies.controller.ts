import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateMovieRequest, MoviesQuery, UpdateMovieRequest } from '@cinenova/shared';

import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Audit } from '../../common/interceptors/audit.interceptor.js';
import { parseWith } from '../../common/pipes/zod-validation.pipe.js';

import { MoviesService } from './movies.service.js';

@ApiTags('movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly movies: MoviesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List movies (public)' })
  list(@Query() query: unknown) {
    return this.movies.list(parseWith(MoviesQuery, query));
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get a movie by slug' })
  bySlug(@Param('slug') slug: string) {
    return this.movies.getBySlug(slug);
  }
}

@ApiTags('admin/movies')
@ApiBearerAuth('access-token')
@Controller('admin/movies')
@Roles('ADMIN', 'STAFF')
export class AdminMoviesController {
  constructor(private readonly movies: MoviesService) {}

  @Get()
  list(@Query() query: unknown) {
    return this.movies.list(parseWith(MoviesQuery, query));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Audit('movie.create', 'Movie')
  create(@Body() body: unknown) {
    return this.movies.create(parseWith(CreateMovieRequest, body));
  }

  @Patch(':id')
  @Audit('movie.update', 'Movie')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.movies.update(id, parseWith(UpdateMovieRequest, body));
  }

  @Delete(':id')
  @Audit('movie.delete', 'Movie')
  remove(@Param('id') id: string) {
    return this.movies.softDelete(id);
  }
}
