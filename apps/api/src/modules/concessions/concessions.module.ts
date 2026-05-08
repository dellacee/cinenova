import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

@ApiTags('concessions')
@Controller('concessions')
export class ConcessionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  list() {
    return this.prisma.concessionItem.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { priceVnd: 'asc' }],
    });
  }
}

@Module({ controllers: [ConcessionsController] })
export class ConcessionsModule {}
