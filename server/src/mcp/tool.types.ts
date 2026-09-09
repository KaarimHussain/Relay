import type { ZodRawShape } from 'zod';

export type AgentTool = {
  name: string;
  description: string;
  inputShape: ZodRawShape;
  handler: (args: any) => Promise<unknown>;
};
