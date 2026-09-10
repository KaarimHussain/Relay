import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  AgentService,
  AgentConversationInput,
  AgentIncomingMessage,
} from './agent.service';
import { AgentBriefingsService } from './agent-briefings.service';

type ChatBody = { messages: AgentIncomingMessage[] };

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(
    private agent: AgentService,
    private briefings: AgentBriefingsService,
  ) {}

  @Get('briefings/latest')
  async latestBriefing(@Req() req: Request) {
    return this.briefings.latest((req as any).user?.id as string);
  }

  @Post('briefings/refresh')
  async refreshBriefing(@Req() req: Request) {
    return this.briefings.generate((req as any).user?.id as string, 'daily', true);
  }

  @Get('conversations')
  async listConversations(@Req() req: Request) {
    return this.agent.listConversations((req as any).user?.id as string);
  }

  @Put('conversations/:conversationId')
  async saveConversation(
    @Req() req: Request,
    @Param('conversationId') conversationId: string,
    @Body() body: Omit<AgentConversationInput, 'id'>,
  ) {
    return this.agent.saveConversation((req as any).user?.id as string, {
      ...body,
      id: conversationId,
    });
  }

  @Delete('conversations/:conversationId')
  async deleteConversation(
    @Req() req: Request,
    @Param('conversationId') conversationId: string,
  ) {
    await this.agent.deleteConversation(
      (req as any).user?.id as string,
      conversationId,
    );
  }

  @Post('chat')
  async chat(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: ChatBody,
  ) {
    const userId = (req as any).user?.id as string;

    return this.stream(res, req, this.agent.chatStream(userId, body.messages ?? []));
  }

  @Post('approvals/:approvalId/approve')
  async approve(
    @Req() req: Request,
    @Res() res: Response,
    @Param('approvalId') approvalId: string,
  ) {
    const userId = (req as any).user?.id as string;
    return this.stream(
      res,
      req,
      this.agent.resolveApprovalStream(userId, approvalId, true),
    );
  }

  @Post('approvals/:approvalId/reject')
  async reject(
    @Req() req: Request,
    @Res() res: Response,
    @Param('approvalId') approvalId: string,
  ) {
    const userId = (req as any).user?.id as string;
    return this.stream(
      res,
      req,
      this.agent.resolveApprovalStream(userId, approvalId, false),
    );
  }

  private async stream(
    res: Response,
    req: Request,
    events: AsyncGenerator<any>,
  ) {
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
      for await (const ev of events) {
        if (closed) break;
        write(ev);
      }
    } catch (e: any) {
      write({ type: 'error', message: e?.message ?? 'Agent stream failed' });
    }
    res.end();
  }
}
