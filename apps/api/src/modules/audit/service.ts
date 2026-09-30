import type { Executor } from "../../db/client";
import { auditLog } from "../../db/schema";
import { newId } from "../../lib/ids";

export interface AuditInput {
  organizationId: string;
  actorUserId: string | null;
  action: string;
  target?: string | null;
  meta?: Record<string, unknown>;
}

export async function recordAudit(executor: Executor, input: AuditInput): Promise<void> {
  await executor.insert(auditLog).values({
    id: newId("aud"),
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: input.action,
    target: input.target ?? null,
    meta: input.meta ?? {},
  });
}
