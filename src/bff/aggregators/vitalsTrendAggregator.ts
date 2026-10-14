import type { AuthView } from '../view/userView.js';
import { listVitalsTrend } from '@/db/repositories/vitalsTrendRepo';

export class VitalsError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function trendView(view: AuthView, visitId: string) {
  if (!visitId) throw new VitalsError(400, 'visitId 必填');
  const points = await listVitalsTrend(visitId);
  return { visitId, points, count: points.length };
}
