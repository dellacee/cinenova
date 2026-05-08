import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';

import { Public } from '../../common/decorators/public.decorator.js';

import { AiProxyService } from './ai-proxy.service.js';

@ApiTags('ai')
@Controller('ai')
export class AiProxyController {
  constructor(private readonly proxy: AiProxyService) {}

  /**
   * Streams SSE chunks from the AI service back to the browser.
   * Rate-limited at 10 calls / min / IP via @Throttle.
   */
  @Public()
  @Throttle({ ai: { ttl: 60_000, limit: 10 } })
  @Post('chat')
  async chat(@Body() body: unknown, @Res() res: Response) {
    const upstream = await fetch(`${this.proxy.baseUrl()}/ai/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...this.proxy.serviceHeaders() },
      body: JSON.stringify(body),
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!upstream.body) {
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    } finally {
      res.end();
    }
  }

  @Public()
  @Get('recommend')
  async recommend(@Query('userId') userId: string | undefined, @Query('limit') limit = '10') {
    const url = new URL(`${this.proxy.baseUrl()}/ai/recommend`);
    if (userId) url.searchParams.set('user_id', userId);
    url.searchParams.set('limit', limit);
    const res = await fetch(url.toString(), { headers: this.proxy.serviceHeaders() });
    return res.json();
  }

  @Public()
  @Post('summarize-reviews/:movieId')
  async summarize(@Param('movieId') movieId: string) {
    const res = await fetch(`${this.proxy.baseUrl()}/ai/summarize-reviews/${movieId}`, {
      method: 'POST',
      headers: this.proxy.serviceHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  }
}
