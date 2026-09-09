import {
  All,
  Controller,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { McpService } from './mcp.service';

@Controller('mcp')
@UseGuards(JwtAuthGuard)
export class McpController {
  constructor(private mcp: McpService) {}

  @All()
  async handle(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id;
    const server = this.mcp.buildServerForUser(userId);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless — each request is self-contained
    });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }
}
