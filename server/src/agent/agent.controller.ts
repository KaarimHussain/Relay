import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AgentService, AgentIncomingMessage } from './agent.service';

type ChatBody = { messages: AgentIncomingMessage[] };

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(private agent: AgentService) {}

  @Post('chat')
  async chat(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: ChatBody,
  ) {
    const userId = (req as any).user?.id as string;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const write = (ev: unknown) => {
      res.write(`data: ${JSON.stringify(ev)}\n\n`);
    };

    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    try {
      for await (const ev of this.agent.chatStream(userId, body.messages ?? [])) {
        if (closed) break;
        write(ev);
      }
    } catch (e: any) {
      write({ type: 'error', message: e?.message ?? 'Agent stream failed' });
    }
    res.end();
  }
}
