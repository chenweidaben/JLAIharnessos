/**
 * 健澜科技 jlmedaios - 病历修改痕迹与版本历史聚合（纯函数）
 *
 * v5.0试点扩展（M190病历版本）：电子病历 5 级硬要求——所有病历修改有完整痕迹记录。
 * 纯函数入参 noteId，返回该病历的版本列表（版本号/修改人/修改时间/修改字段/旧值/新值/修改原因）。
 * DEMO_MODE 下返回内存种子数据（3 份病历预置修改记录），不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 单条病历版本（修改痕迹） */
export interface NoteVersion {
  /** 病历 ID */
  noteId: string;
  /** 版本号（v1 为初稿/新增，v2+ 为修改） */
  version: number;
  /** 修改人 */
  modifiedBy: string;
  /** 修改时间（ISO 字符串） */
  modifiedAt: string;
  /** 修改字段（如 主诉/诊断/查体/治疗） */
  field: string;
  /** 旧值（v1 新增时为空串） */
  oldValue: string;
  /** 新值 */
  newValue: string;
  /** 修改原因 */
  reason: string;
}

/**
 * DEMO 种子：3 份病历预置修改记录
 *  - demo-note-001 李* 肺炎首次病程 v1→v2→v3→v4→v5（5 条，供前端默认调用）
 *  - demo-note-002 张* 急性心梗入院记录 v1→v2（修改主诉字段）
 *  - demo-note-003 王* 术后记录 v1（新增）
 */
const DEMO_VERSIONS: Record<string, NoteVersion[]> = {
  'demo-note-001': [
    {
      noteId: 'demo-note-001',
      version: 1,
      modifiedBy: '住院医 钱峰',
      modifiedAt: '2026-10-17T09:20:00+08:00',
      field: '首次病程记录',
      oldValue: '',
      newValue: '患者男性，58 岁，因"发热咳嗽 3 天"入院。初步诊断社区获得性肺炎。',
      reason: '首次病程记录初稿（AI 语音辅助生成）',
    },
    {
      noteId: 'demo-note-001',
      version: 2,
      modifiedBy: '住院医 钱峰',
      modifiedAt: '2026-10-17T11:05:00+08:00',
      field: '诊断',
      oldValue: '社区获得性肺炎',
      newValue: '社区获得性肺炎（右中叶）',
      reason: '胸部 CT 回报右中叶斑片影，定位诊断修正',
    },
    {
      noteId: 'demo-note-001',
      version: 3,
      modifiedBy: '主治 陈维',
      modifiedAt: '2026-10-17T15:40:00+08:00',
      field: '查体',
      oldValue: '双肺呼吸音清',
      newValue: '右肺中叶可闻及湿啰音',
      reason: '上级医师查房查体复核',
    },
    {
      noteId: 'demo-note-001',
      version: 4,
      modifiedBy: '主治 陈维',
      modifiedAt: '2026-10-18T09:10:00+08:00',
      field: '诊断',
      oldValue: '社区获得性肺炎（右中叶）',
      newValue: '社区获得性肺炎（右中叶），非重症',
      reason: 'PSI 评分 65 分，分层为非重症',
    },
    {
      noteId: 'demo-note-001',
      version: 5,
      modifiedBy: '主任 王莉',
      modifiedAt: '2026-10-18T16:30:00+08:00',
      field: '治疗',
      oldValue: '头孢呋辛 1.5g q8h',
      newValue: '头孢呋辛 1.5g q8h + 阿奇霉素 0.5g qd',
      reason: '经验性覆盖非典型病原体，主任查房意见',
    },
  ],
  'demo-note-002': [
    {
      noteId: 'demo-note-002',
      version: 1,
      modifiedBy: '住院医 李明',
      modifiedAt: '2026-10-15T08:30:00+08:00',
      field: '入院记录',
      oldValue: '',
      newValue: '患者男性，62 岁，因"胸痛 2 小时"入院。',
      reason: '入院记录初稿',
    },
    {
      noteId: 'demo-note-002',
      version: 2,
      modifiedBy: '主治 赵强',
      modifiedAt: '2026-10-15T10:15:00+08:00',
      field: '主诉',
      oldValue: '胸痛 2 小时',
      newValue: '胸痛 2 小时，向左肩放射',
      reason: '病史补充，放射痛提示心梗',
    },
  ],
  'demo-note-003': [
    {
      noteId: 'demo-note-003',
      version: 1,
      modifiedBy: '住院医 周涛',
      modifiedAt: '2026-10-19T07:50:00+08:00',
      field: '术后记录',
      oldValue: '',
      newValue: '患者于今日 06:30 在全麻下行腹腔镜胆囊切除术，术中出血约 20ml，术毕安返病房。',
      reason: '术后即时记录新增',
    },
  ],
};

/**
 * 纯函数：返回指定病历的版本列表（按版本号升序）。
 * DEMO 种子未命中时返回空数组（调用方按需处理）。
 */
export function listNoteVersions(noteId: string): NoteVersion[] {
  if (!noteId) return [];
  const list = DEMO_VERSIONS[noteId] ?? [];
  return [...list].sort((a, b) => a.version - b.version);
}
