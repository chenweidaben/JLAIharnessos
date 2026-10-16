/**
 * 健澜科技 jlmedaios - 【病案设备耗材】医院病案管理深化 BFF 路由（M177-A）
 *
 *   GET /api/v1/medical-record/deep?period=2026-10
 *     读取出院病案首页（clinical.medical_records），交由纯函数聚合器
 *     （aggregators/medicalRecordDeepAggregator.ts）完成：
 *       1) validateICDCoding        —— ICD-10 诊断 + ICD-9-CM-3 手术编码校验（不自创）
 *       2) checkRecordCompletion    —— 病案首页完整性检查（缺项率）
 *       3) generateRecordQualityReport —— 病案质量报告（首页合格率/编码准确率/缺项率/归档及时率）
 *
 * 降级原则：DEMO_MODE 不连 PostgreSQL，返回内置演示样例并显式标注 demo=true；
 * 未查到病案时返回 hasData=false，不虚构数字。
 * 权限码：medical-record:deep:view（病案室/质控科/admin 只读）。
 * 医疗安全红线：仅病案管理辅助，不触发诊疗、不自动改诊断/手术、不自动归档。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildDeepMedicalRecord,
  generateRecordQualityReport,
  type DeepMedicalRecord,
  type DeepMedicalRecordInput,
  type RecordDiagnosis,
  type RecordSurgery,
} from '../aggregators/medicalRecordDeepAggregator';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 病案记录行（clinical.medical_records 扩展列，见 356-medical-record-deep.sql） */
interface MedicalRecordRow {
  id: string;
  visit_id: string;
  patient_id: string;
  department: string;
  discharge_at: string | null;
  archived_at: string | null;
  primary_dx_icd10: string | null;
  primary_dx_name: string | null;
  secondary_dx_icd10s: unknown;
  surgery_icd9cm3: unknown;
  gender: string | null;
  age: number | null;
  discharge_disposition: string | null;
  los_days: number | null;
  total_fee: number | null;
  has_surgery: boolean | null;
  doctor_signed: boolean | null;
  coder_signed: boolean | null;
  borrow_status: string | null;
  confidentiality: string | null;
}

/**
 * 演示样例：覆盖 合格病案 / ICD 自创编码 / 首页缺项 / 手术病例缺手术编码 /
 * 归档逾期 / 借阅超期 六类情形。ICD 编码均为真实标准编码，非法项用于演示校验拦截。
 */
function demoInputs(): DeepMedicalRecordInput[] {
  const base: Omit<DeepMedicalRecord, 'now'> = {
    recordId: '', visitId: '', patientId: 'pat_demo', department: '',
    archiveDeadlineDays: 3, archivedAt: null,
    gender: '男', age: 58, dischargeDisposition: '好转',
    losDays: 9, totalFee: 18600, hasSurgery: false,
    doctorSigned: true, coderSigned: true,
    borrowStatus: 'none', confidentiality: 'internal', borrowDueAt: null,
  };
  return [
    {
      // 合格：ICD-10 主诊断 + ICD-9-CM-3 手术均合法，要素齐全，按时归档
      record: {
        ...base,
        recordId: 'mr-demo-001', visitId: 'v-demo-001', department: '普外科',
        dischargeAt: '2026-10-08T10:00:00+08:00', archivedAt: '2026-10-09T15:00:00+08:00',
        hasSurgery: true,
      },
      diagnoses: [
        { code: 'K80.2', name: '胆囊结石伴慢性胆囊炎', rank: 'principal' as const },
        { code: 'K21.9', name: '胃食管反流病', rank: 'secondary' as const },
      ],
      surgeries: [
        { code: '51.23', name: '腹腔镜胆囊切除术', level: 'level3' as const, date: '2026-10-06' },
      ],
    },
    {
      // 自创编码拦截：主诊断写成中文+臆造码 'ABCD1'
      record: {
        ...base,
        recordId: 'mr-demo-002', visitId: 'v-demo-002', department: '呼吸内科',
        dischargeAt: '2026-10-10T10:00:00+08:00', archivedAt: '2026-10-11T15:00:00+08:00',
      },
      diagnoses: [
        { code: 'J18.9', name: '肺炎', rank: 'principal' as const },
        { code: 'ABCD1', name: '自创诊断', rank: 'secondary' as const },
      ],
      surgeries: [],
    },
    {
      // 首页缺项：缺年龄、出院方式、总费用
      record: {
        ...base,
        recordId: 'mr-demo-003', visitId: 'v-demo-003', department: '心内科',
        dischargeAt: '2026-10-12T10:00:00+08:00', archivedAt: null,
        age: null, dischargeDisposition: '', totalFee: null,
      },
      diagnoses: [
        { code: 'I50.9', name: '心力衰竭', rank: 'principal' as const },
      ],
      surgeries: [],
    },
    {
      // 有手术标记但漏填手术 ICD-9-CM-3 编码
      record: {
        ...base,
        recordId: 'mr-demo-004', visitId: 'v-demo-004', department: '骨科',
        dischargeAt: '2026-10-09T10:00:00+08:00', archivedAt: '2026-10-13T15:00:00+08:00',
        hasSurgery: true,
      },
      diagnoses: [
        { code: 'M17.11', name: '膝骨关节炎', rank: 'principal' as const },
      ],
      surgeries: [],
    },
    {
      // 借阅超期：机密病案逾期未还
      record: {
        ...base,
        recordId: 'mr-demo-005', visitId: 'v-demo-005', department: '普外科',
        dischargeAt: '2026-10-01T10:00:00+08:00', archivedAt: '2026-10-03T15:00:00+08:00',
        borrowStatus: 'borrowed', confidentiality: 'confidential',
        borrowDueAt: '2026-10-10T18:00:00+08:00',
      },
      diagnoses: [
        { code: 'K35.9', name: '急性阑尾炎', rank: 'principal' as const },
      ],
      surgeries: [
        { code: '47.09', name: '阑尾切除术', level: 'level2' as const, date: '2026-09-29' },
      ],
    },
  ];
}

export const medicalRecordDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/medical-record/deep',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medical-record:deep:view');
      if (denied) return denied;

      const period = c.query.get('period')?.trim() ?? '';

      // DEMO 模式：内置样例，前端直接可演示
      if (isDemo) {
        const inputs = demoInputs();
        const records = inputs.map((i) => buildDeepMedicalRecord(i));
        const report = generateRecordQualityReport(period || '2026-10', inputs);
        return json(ok({
          demo: true,
          hasData: true,
          message: '演示模式：使用内置样例数据，未连接 PostgreSQL',
          records,
          report,
          generatedAt: new Date().toISOString(),
        }));
      }

      try {
        const db = getDb();
        const periodStart = period ? `${period}-01` : null;
        const rows = (await db`
          SELECT id, visit_id, patient_id, department, discharge_at, archived_at,
                 primary_dx_icd10, primary_dx_name, secondary_dx_icd10s, surgery_icd9cm3,
                 gender, age, discharge_disposition, los_days, total_fee,
                 has_surgery, doctor_signed, coder_signed, borrow_status, confidentiality
          FROM clinical.medical_records
          WHERE record_type = 'front_page'
            AND (${periodStart}::text IS NULL OR created_at >= ${periodStart}::date)
          ORDER BY created_at DESC
          LIMIT 500
        `) as MedicalRecordRow[];

        if (!rows || rows.length === 0) {
          return json(ok({
            period, demo: false, hasData: false,
            message: '暂无出院病案首页数据，病案室完成病案编目后再分析',
          }));
        }

        const inputs = rows.map((r) => {
          const record: DeepMedicalRecord = {
            recordId: r.id,
            visitId: r.visit_id,
            patientId: r.patient_id,
            department: r.department,
            dischargeAt: r.discharge_at ?? undefined,
            archivedAt: r.archived_at ?? null,
            gender: r.gender ?? undefined,
            age: r.age ?? null,
            dischargeDisposition: r.discharge_disposition ?? undefined,
            losDays: r.los_days ?? null,
            totalFee: r.total_fee ?? null,
            hasSurgery: r.has_surgery ?? false,
            doctorSigned: r.doctor_signed ?? false,
            coderSigned: r.coder_signed ?? false,
            borrowStatus: (r.borrow_status as DeepMedicalRecord['borrowStatus']) ?? 'none',
            confidentiality: (r.confidentiality as DeepMedicalRecord['confidentiality']) ?? 'internal',
            borrowDueAt: null,
          };
          const diagnoses: RecordDiagnosis[] = [];
          if (r.primary_dx_icd10) {
            diagnoses.push({ code: r.primary_dx_icd10, name: r.primary_dx_name ?? '', rank: 'principal' });
          }
          for (const s of (Array.isArray(r.secondary_dx_icd10s) ? r.secondary_dx_icd10s : []) as Array<{ code?: string; name?: string }>) {
            diagnoses.push({ code: s.code ?? '', name: s.name ?? '', rank: 'secondary' });
          }
          const surgeries: RecordSurgery[] =
            (Array.isArray(r.surgery_icd9cm3) ? r.surgery_icd9cm3 : []) as RecordSurgery[];
          return { record, diagnoses, surgeries };
        });

        const records = inputs.map((i) => buildDeepMedicalRecord(i));
        const report = generateRecordQualityReport(period || 'latest', inputs);
        return json(ok({
          demo: false,
          hasData: true,
          records,
          report,
          generatedAt: new Date().toISOString(),
        }));
      } catch (err) {
        console.error(`[medicalRecordDeep] GET /medical-record/deep [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '病案深化加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
