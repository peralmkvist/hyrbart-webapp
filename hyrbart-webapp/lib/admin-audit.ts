import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export async function recordAdminAction({
  adminUserId,
  action,
  entityType,
  entityId,
  metadata = {},
}: {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from('admin_audit_log').insert({
    admin_user_id: adminUserId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata,
  });
  if (error) throw error;
}
