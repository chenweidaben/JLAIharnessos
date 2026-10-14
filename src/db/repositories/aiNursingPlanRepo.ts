/**
 * 健澜科技 jlmedaios - M90-B AI护理计划推荐 Repository
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../pool.js';

export interface NursingPlanItem {
  item: string;
  category: string;
}

export interface AiNursingPlan {
  id: string;
  visitId: string;
  diagnosis: string;
  plan: NursingPlanItem[];
  riskLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'accepted' | 'rejected';
  operator: string | null;
  createdAt: string;
}

export async function create(input: {
  visitId: string;
  diagnosis: string;
  plan: NursingPlanItem[];
  riskLevel: string;
}): Promise<AiNursingPlan> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.ai_nursing_plans (visit_id, diagnosis, plan, risk_level)
    VALUES (${input.visitId}, ${input.diagnosis},
      ${JSON.stringify(input.plan)}::jsonb, ${input.riskLevel})
    RETURNING *
  `;
  return mapRow(rows[0]);
}

export async function getById(id: string): Promise<AiNursingPlan | null> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.ai_nursing_plans WHERE id=${id} LIMIT 1`;
  return rows.length ? mapRow(rows[0]) : null;
}

/** pending → accepted，落库操作人；仅当仍为 pending 时生效，否则返回 null */
export async function accept(id: string, operatorId: string): Promise<AiNursingPlan | null> {
  const db = getDb();
  const rows = await db`
    UPDATE clinical.ai_nursing_plans
    SET status='accepted', operator=${operatorId}
    WHERE id=${id} AND status='pending'
    RETURNING *
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

function mapRow(r: Record<string, unknown>): AiNursingPlan {
  return {
    id: r.id as string,
    visitId: r.visit_id as string,
    diagnosis: (r.diagnosis as string) ?? '',
    plan: (r.plan as NursingPlanItem[]) ?? [],
    riskLevel: r.risk_level as 'low' | 'medium' | 'high',
    status: r.status as 'pending' | 'accepted' | 'rejected',
    operator: (r.operator as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}
