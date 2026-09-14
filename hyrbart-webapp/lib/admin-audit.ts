import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type {AdminRole} from '@/lib/admin';

export async function recordAdminAction({
  adminUserId,
  adminRole,
  action,
  entityType,
  entityId,
  requestId,
  metadata = {},
}: {
  adminUserId: string;
  adminRole?: AdminRole | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from('admin_audit_log').insert({
    admin_user_id: adminUserId,
    admin_role: adminRole ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    request_id: requestId ?? null,
    metadata,
  });
  if (error) throw error;
}
