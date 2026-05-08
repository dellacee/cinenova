import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CreateShowtimeRequest, ShowtimesQuery, UpdateShowtimeRequest } from '@cinenova/shared';

import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Audit } from '../../common/interceptors/audit.interceptor.js';
import { parseWith } from '../../common/pipes/zod-validation.pipe.js';

import { ShowtimesService } from './showtimes.service.js';

@ApiTags('showtimes')
@Controller('showtimes')
export class ShowtimesController {
  constructor(private readonly showtimes: ShowtimesService) {}

  @Public()
  @Get()
  list(@Query() query: unknown) {
    return this.showtimes.list(parseWith(ShowtimesQuery, query));
  }

  @Public()
  @Get(':id')
  byId(@Param('id') id: string) {
    return this.showtimes.getById(id);
  }
}

@ApiTags('admin/showtimes')
@ApiBearerAuth('access-token')
@Controller('admin/showtimes')
@Roles('ADMIN', 'STAFF')
export class AdminShowtimesController {
  constructor(private readonly showtimes: ShowtimesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Audit('showtime.create', 'Showtime')
  create(@Body() body: unknown) {
    return this.showtimes.create(parseWith(CreateShowtimeRequest, body));
  }

  @Patch(':id')
  @Audit('showtime.update', 'Showtime')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.showtimes.update(id, parseWith(UpdateShowtimeRequest, body));
  }

  @Delete(':id')
  @Audit('showtime.cancel', 'Showtime')
  cancel(@Param('id') id: string) {
    return this.showtimes.cancel(id);
  }
}
