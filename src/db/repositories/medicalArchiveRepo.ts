import { getDb } from '../pool.js';

export interface Archive {
  id: string; visitId: string;
  archiveStatus: 'in_ward'|'archived'|'sealed';
  archivedAt: string | null; archivedBy: string | null;
  sealedAt: string | null; sealedBy: string | null; sealReason: string | null;
}

export async function getByVisit(visitId: string): Promise<Archive | null> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.medical_record_archives WHERE visit_id=${visitId} LIMIT 1`;
  return rows.length ? mapRow(rows[0]) : null;
}

export async function archive(visitId: string, userId: string): Promise<Archive> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.medical_record_archives (visit_id, archive_status, archived_at, archived_by)
    VALUES (${visitId}, 'archived', now(), ${userId})
    ON CONFLICT (visit_id) DO UPDATE SET archive_status='archived', archived_at=now(), archived_by=${userId}, updated_at=now()
    WHERE clinical.medical_record_archives.archive_status = 'in_ward'
    RETURNING *
  `;
  if (!rows.length) throw new Error('病历已归档或封存，不可重复归档');
  return mapRow(rows[0]);
}

export async function seal(visitId: string, userId: string, reason: string): Promise<Archive> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.medical_record_archives
    SET archive_status='sealed', sealed_at=now(), sealed_by=${userId}, seal_reason=${reason}, updated_at=now()
    WHERE visit_id=${visitId} AND archive_status='archived'
    RETURNING *
  `;
  if (!rows.length) throw new Error('仅已归档病历可封存');
  return mapRow(rows[0]);
}

function mapRow(r: Record<string, unknown>): Archive {
  return {
    id: r.id as string, visitId: r.visit_id as string,
    archiveStatus: r.archive_status as 'in_ward'|'archived'|'sealed',
    archivedAt: r.archived_at as string | null, archivedBy: r.archived_by as string | null,
    sealedAt: r.sealed_at as string | null, sealedBy: r.sealed_by as string | null,
    sealReason: r.seal_reason as string | null,
  };
}
