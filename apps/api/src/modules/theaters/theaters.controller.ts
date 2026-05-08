import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CreateTheaterRequest, UpdateTheaterRequest } from '@cinenova/shared';

import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Audit } from '../../common/interceptors/audit.interceptor.js';
import { parseWith } from '../../common/pipes/zod-validation.pipe.js';

import { TheatersService } from './theaters.service.js';

@ApiTags('theaters')
@Controller('theaters')
export class TheatersController {
  constructor(private readonly theaters: TheatersService) {}

  @Public()
  @Get()
  list(@Query('city') city?: string) {
    return this.theaters.list(city);
  }

  @Public()
  @Get('cities')
  cities() {
    return this.theaters.listCities();
  }

  @Public()
  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    return this.theaters.getBySlug(slug);
  }
}

@ApiTags('admin/theaters')
@ApiBearerAuth('access-token')
@Controller('admin/theaters')
@Roles('ADMIN', 'STAFF')
export class AdminTheatersController {
  constructor(private readonly theaters: TheatersService) {}

  @Get()
  list(@Query('city') city?: string) {
    return this.theaters.list(city);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Audit('theater.create', 'Theater')
  create(@Body() body: unknown) {
    return this.theaters.create(parseWith(CreateTheaterRequest, body));
  }

  @Patch(':id')
  @Audit('theater.update', 'Theater')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.theaters.update(id, parseWith(UpdateTheaterRequest, body));
  }

  @Delete(':id')
  @Audit('theater.delete', 'Theater')
  remove(@Param('id') id: string) {
    return this.theaters.softDelete(id);
  }
}
