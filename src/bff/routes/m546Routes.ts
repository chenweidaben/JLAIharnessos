/**
 * 健澜科技 jlmedaios - M546 新标准 P1：互联互通四甲标准数据集映射 2 端点
 *
 * GET /api/v1/datasets                       8 数据集目录列表
 * GET /api/v1/datasets/:code/fields          某数据集字段列表（含 WS 363 国标映射编码）；code 不存在 → 404
 *
 * 种子：8 数据集 × 10 字段 = 80 字段，每字段标注 WS 363 国标编码。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type DataType = 'string' | 'number' | 'date' | 'boolean';

interface DataField {
  fieldCode: string;
  fieldName: string;
  dataType: DataType;
  mandatory: boolean;
  ws363Code: string;
}

interface Dataset {
  code: string;
  name: string;
  ws363Mapping: string;
  fields: DataField[];
}

// ============================== 字段构造工具 ==============================

function f(fieldCode: string, fieldName: string, dataType: DataType, mandatory: boolean, ws363Code: string): DataField {
  return { fieldCode, fieldName, dataType, mandatory, ws363Code };
}

// ============================== 8 数据集 × 10 字段 ==============================

const datasets: Dataset[] = [
  {
    code: 'inpatient_cover', name: '住院病案首页', ws363Mapping: 'WS 363.1-2011 病案首页',
    fields: [
      f('patient_id', '患者标识', 'string', true, 'DE01.00.001.00'),
      f('gender', '患者性别', 'string', true, 'DE01.00.005.00'),
      f('birth_date', '出生日期', 'date', true, 'DE01.00.026.00'),
      f('id_card', '身份证件号', 'string', true, 'DE01.00.014.00'),
      f('admission_date', '入院日期时间', 'date', true, 'DE02.01.020.00'),
      f('discharge_date', '出院日期时间', 'date', true, 'DE02.01.025.00'),
      f('main_diagnosis', '主要诊断', 'string', true, 'DE04.01.019.00'),
      f('operation_date', '手术开始日期时间', 'date', false, 'DE04.50.095.00'),
      f('admission_route', '入院途径', 'string', true, 'DE02.01.039.00'),
      f('total_cost', '总费用', 'number', false, 'DE06.00.085.00'),
    ],
  },
  {
    code: 'admission_record', name: '入院记录', ws363Mapping: 'WS 363.2-2011 基本医疗服务',
    fields: [
      f('patient_id', '患者标识', 'string', true, 'DE01.00.001.00'),
      f('chief_complaint', '主诉', 'string', true, 'DE02.01.019.00'),
      f('present_illness', '现病史', 'string', true, 'DE02.01.021.00'),
      f('past_history', '既往史', 'string', false, 'DE02.01.027.00'),
      f('allergy_history', '过敏史', 'string', false, 'DE02.01.033.00'),
      f('physical_exam', '体格检查', 'string', true, 'DE02.01.035.00'),
      f('admission_date', '入院日期时间', 'date', true, 'DE02.01.020.00'),
      f('doctor_id', '经治医师工号', 'string', true, 'DE02.01.037.00'),
      f('mental_status', '精神状态', 'string', false, 'DE02.01.041.00'),
      f('nutrition_status', '营养状态', 'string', false, 'DE02.01.043.00'),
    ],
  },
  {
    code: 'progress_note', name: '病程记录', ws363Mapping: 'WS 363.3-2011 住院病程',
    fields: [
      f('patient_id', '患者标识', 'string', true, 'DE01.00.001.00'),
      f('visit_id', '住院就诊号', 'string', true, 'DE02.01.001.00'),
      f('note_date', '病程记录日期时间', 'date', true, 'DE02.02.011.00'),
      f('note_type', '病程记录类型', 'string', true, 'DE02.02.003.00'),
      f('content', '病程记录内容', 'string', true, 'DE02.02.013.00'),
      f('temperature', '体温', 'number', false, 'DE08.10.026.00'),
      f('systolic_bp', '收缩压', 'number', false, 'DE08.10.021.00'),
      f('diastolic_bp', '舒张压', 'number', false, 'DE08.10.023.00'),
      f('doctor_id', '医师工号', 'string', true, 'DE02.01.037.00'),
      f('attending_id', '主治医师工号', 'string', true, 'DE02.02.015.00'),
    ],
  },
  {
    code: 'operation_record', name: '手术记录', ws363Mapping: 'WS 363.4-2011 手术操作',
    fields: [
      f('patient_id', '患者标识', 'string', true, 'DE01.00.001.00'),
      f('operation_name', '手术名称', 'string', true, 'DE04.50.001.00'),
      f('operation_code', '手术操作编码', 'string', true, 'DE04.50.007.00'),
      f('start_time', '手术开始日期时间', 'date', true, 'DE04.50.095.00'),
      f('end_time', '手术结束日期时间', 'date', true, 'DE04.50.097.00'),
      f('anaesthesia_type', '麻醉方式', 'string', true, 'DE04.40.005.00'),
      f('surgeon_id', '主刀医师工号', 'string', true, 'DE04.50.011.00'),
      f('assistant_ids', '助手医师工号列表', 'string', false, 'DE04.50.013.00'),
      f('blood_loss', '术中出血量(ml)', 'number', false, 'DE04.50.033.00'),
      f('incision_grade', '切口等级', 'string', true, 'DE04.50.027.00'),
    ],
  },
  {
    code: 'discharge_summary', name: '出院记录', ws363Mapping: 'WS 363.5-2011 出院小结',
    fields: [
      f('patient_id', '患者标识', 'string', true, 'DE01.00.001.00'),
      f('admission_date', '入院日期时间', 'date', true, 'DE02.01.020.00'),
      f('discharge_date', '出院日期时间', 'date', true, 'DE02.01.025.00'),
      f('discharge_reason', '出院原因', 'string', true, 'DE02.01.043.00'),
      f('main_diagnosis', '主要诊断', 'string', true, 'DE04.01.019.00'),
      f('secondary_diagnoses', '其他诊断列表', 'string', false, 'DE04.01.023.00'),
      f('treatment_summary', '诊疗经过', 'string', true, 'DE02.01.045.00'),
      f('discharge_status', '出院状态', 'string', true, 'DE02.01.047.00'),
      f('follow_up_advice', '出院医嘱', 'string', false, 'DE02.01.049.00'),
      f('attending_id', '主治医师工号', 'string', true, 'DE02.01.037.00'),
    ],
  },
  {
    code: 'nursing_record', name: '护理记录', ws363Mapping: 'WS 363.6-2011 护理评估',
    fields: [
      f('patient_id', '患者标识', 'string', true, 'DE01.00.001.00'),
      f('record_time', '护理记录日期时间', 'date', true, 'DE08.10.001.00'),
      f('temperature', '体温', 'number', true, 'DE08.10.026.00'),
      f('pulse', '脉搏', 'number', true, 'DE08.10.022.00'),
      f('respiration', '呼吸频率', 'number', true, 'DE08.10.024.00'),
      f('systolic_bp', '收缩压', 'number', true, 'DE08.10.021.00'),
      f('nurse_id', '护士工号', 'string', true, 'DE08.00.005.00'),
      f('consciousness', '意识状态', 'string', false, 'DE08.10.031.00'),
      f('skin_condition', '皮肤情况', 'string', false, 'DE08.10.037.00'),
      f('nursing_note', '护理观察内容', 'string', false, 'DE08.10.039.00'),
    ],
  },
  {
    code: 'lab_report', name: '检验报告', ws363Mapping: 'WS 363.7-2011 检验结果',
    fields: [
      f('patient_id', '患者标识', 'string', true, 'DE01.00.001.00'),
      f('report_id', '检验报告编号', 'string', true, 'DE03.00.001.00'),
      f('test_item', '检验项目名称', 'string', true, 'DE03.00.031.00'),
      f('test_value', '检验结果值', 'string', true, 'DE03.00.035.00'),
      f('test_unit', '结果单位', 'string', false, 'DE03.00.037.00'),
      f('ref_range', '参考范围', 'string', false, 'DE03.00.039.00'),
      f('abnormal_flag', '异常标志', 'string', false, 'DE03.00.041.00'),
      f('sample_date', '标本采集日期时间', 'date', true, 'DE03.00.017.00'),
      f('report_date', '报告日期时间', 'date', true, 'DE03.00.019.00'),
      f('lab_technician_id', '检验技师工号', 'string', true, 'DE03.00.053.00'),
    ],
  },
  {
    code: 'imaging_report', name: '检查报告', ws363Mapping: 'WS 363.8-2011 检查结果',
    fields: [
      f('patient_id', '患者标识', 'string', true, 'DE01.00.001.00'),
      f('report_id', '检查报告编号', 'string', true, 'DE03.01.001.00'),
      f('exam_item', '检查项目名称', 'string', true, 'DE03.01.031.00'),
      f('exam_modality', '检查 modality', 'string', true, 'DE03.01.033.00'),
      f('finding', '检查所见', 'string', true, 'DE03.01.039.00'),
      f('impression', '检查印象', 'string', true, 'DE03.01.041.00'),
      f('exam_date', '检查日期时间', 'date', true, 'DE03.01.017.00'),
      f('report_date', '报告日期时间', 'date', true, 'DE03.01.019.00'),
      f('radiologist_id', '放射医师工号', 'string', true, 'DE03.01.053.00'),
      f('image_count', '影像张数', 'number', false, 'DE03.01.055.00'),
    ],
  },
];

const datasetStore = new Map<string, Dataset>(datasets.map((d) => [d.code, d]));

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [
        { severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` },
      ],
    },
    404,
  );
}

// ============================== 1. GET /api/v1/datasets 目录列表 ==============================

async function handleDatasetList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = datasets.map((d) => ({
    code: d.code, name: d.name, fieldCount: d.fields.length, ws363Mapping: d.ws363Mapping,
  }));
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 2. GET /api/v1/datasets/:code/fields 字段列表 ==============================

async function handleDatasetFields(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const code = (c.params.code ?? '').trim();
  const ds = datasetStore.get(code);
  if (!ds) return notFound('Dataset', code);
  return json(ok({ datasetCode: ds.code, totalCount: ds.fields.length, fields: ds.fields }), 200);
}

export const m546Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/datasets', handle: handleDatasetList, auth: true },
  { method: 'GET', path: '/api/v1/datasets/:code/fields', handle: handleDatasetFields, auth: true },
];
