import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request } from 'express';
import { type Observable, tap } from 'rxjs';

import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { type AuthenticatedUser } from '../decorators/current-user.decorator.js';

const AUDIT_METADATA_KEY = 'audit';

export interface AuditMetadata {
  action: string;
  targetType: string;
}

export const Audit = (action: string, targetType: string) => {
  return Reflect.metadata(AUDIT_METADATA_KEY, { action, targetType });
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMetadata | undefined>(AUDIT_METADATA_KEY, context.getHandler());
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const actorId = req.user?.sub;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    return next.handle().pipe(
      tap((result: unknown) => {
        const targetId = (result as { id?: string } | undefined)?.id ?? 'unknown';
        void this.prisma.auditLog.create({
          data: {
            actorId: actorId ?? null,
            action: meta.action,
            targetType: meta.targetType,
            targetId,
            diff: req.body ? (req.body as object) : undefined,
            ip,
            userAgent: typeof userAgent === 'string' ? userAgent : null,
          },
        });
      }),
    );
  }
}
