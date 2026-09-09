import { Module } from '@nestjs/common';
import { McpModule } from '../mcp/mcp.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

@Module({
  imports: [McpModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
