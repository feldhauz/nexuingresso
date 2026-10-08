import "server-only";
import type { Db } from "./db";
import { newId } from "./ids";

export async function audit(
  db: Db,
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string,
  data: Record<string, unknown> = {},
) {
  await db.query(
    `INSERT INTO audit_log (id, actor_id, action, entity, entity_id, data)
     VALUES ($1, $2, $3, $4, $5, $6::text::jsonb)`,
    [newId(), actorId, action, entity, entityId, JSON.stringify(data)],
  );
}
