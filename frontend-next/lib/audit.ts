import { NextRequest } from 'next/server';
import { AuditLog } from '@/lib/models';
import { clientIp } from '@/lib/api';
import type { AuthContext } from '@/lib/auth/guard';

/** Records a mutation. Never throws: auditing must not break the business operation. */
export async function audit(
  auth: Pick<AuthContext, 'userId' | 'role' | 'organizationId'> | null,
  action: string,
  entity: string,
  entityId?: unknown,
  meta?: Record<string, unknown>,
  req?: NextRequest
): Promise<void> {
  try {
    await AuditLog.create({
      organization: auth?.organizationId || undefined,
      actor: auth?.userId,
      actorRole: auth?.role,
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      meta,
      ip: req ? clientIp(req) : undefined,
    });
  } catch (e) {
    console.error('[audit] failed to write audit log', e);
  }
}
