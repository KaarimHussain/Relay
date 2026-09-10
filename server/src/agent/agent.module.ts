import { Module } from '@nestjs/common';
import { McpModule } from '../mcp/mcp.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentBriefingsService } from './agent-briefings.service';

@Module({
  imports: [McpModule, PrismaModule],
  controllers: [AgentController],
  providers: [AgentService, AgentBriefingsService],
})
export class AgentModule {}
