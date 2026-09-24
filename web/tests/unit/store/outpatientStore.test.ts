/**
 * 健澜科技 jlmedaios - 门诊工作台状态管理测试
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * outpatientStore 测试：候诊队列 / 就诊快照 / 问诊 / 诊断 / 医嘱 /
 * 处方草稿·提交·审核 / 病历 / 统计 / 结束就诊 / 医生会话 / AI 初始化。
 *
 * 通过 vi.mock 隔离 BFF 服务，单测只校验 store 状态机；交易数据真实落库由后端测试与 e2e 覆盖。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOutpatientStore } from '@/store/outpatientStore';
import { useAuthStore } from '@/store/authStore';
import type {
  ConsultationRecord,
  DrugInfo,
  OutpatientStats,
  PatientBrief,
  Prescription,
  RecordContent,
  WaitingPatient,
} from '@/types/outpatient';
import type { EncounterBundle } from '@/services/api/outpatient';

vi.mock('@/services/api/outpatient', () => ({
  getQueue: vi.fn(),
  getEncounter: vi.fn(),
  saveConsultation: vi.fn(),
  addDiagnosis: vi.fn(),
  confirmDiagnosis: vi.fn(),
  removeDiagnosis: vi.fn(),
  addOrder: vi.fn(),
  cancelOrder: vi.fn(),
  submitPrescription: vi.fn(),
  auditPrescription: vi.fn(),
  saveRecord: vi.fn(),
  getStats: vi.fn(),
}));

vi.mock('@/services/api/aiConversation', () => ({
  createAiConversation: vi.fn(),
  getAiMessages: vi.fn(),
  streamAiMessage: vi.fn(),
}));

import * as opApi from '@/services/api/outpatient';
import * as aiApi from '@/services/api/aiConversation';

/* ---------------- 夹具 ---------------- */

const patient: PatientBrief = {
  patientId: 'P100086',
  nameMasked: '李*',
  gender: 'female',
  age: 68,
  insurance: 'self',
  allergies: ['青霉素'],
  chronicConditions: ['原发性高血压', '2型糖尿病'],
  currentMedications: [],
};

const waiting: WaitingPatient = {
  encounterId: 'enc-1',
  queueNo: 1,
  ticketNo: 'T001',
  patient,
  visitType: 'normal',
  registerTime: '2026/9/25 08:00:00',
  status: 'waiting',
  doctorName: '陈医生',
  deptName: '心血管内科',
  chiefComplaint: '活动后气促',
  waitMinutes: 111,
};

const consultation: ConsultationRecord = {
  encounterId: 'enc-1',
  chiefComplaint: '活动后气促、双下肢水肿 2 周',
  presentIllness: { mainSymptom: '活动后气促' },
  pastHistory: { diseases: '原发性高血压' },
  physicalExam: {},
  auxiliaryExams: [],
  updatedAt: '2026/9/25 08:05:00',
};

const prescription: Prescription = {
  prescriptionId: 'rx-1',
  type: 'western',
  lines: [],
  warnings: [],
  totalFee: 12.5,
  signed: false,
  status: 'pending_review',
  createdAt: '2026/9/25 08:06:00',
};

const bundle: EncounterBundle = {
  encounterId: 'enc-1',
  patient,
  consultation,
  diagnoses: [
    { id: 'd1', code: 'I47.100', name: '阵发性室上性心动过速', kind: 'primary', confirmed: true },
  ],
  orders: [
    {
      orderId: 'ord-1',
      kind: 'lab',
      catalogId: 'lab-ecg',
      name: '十二导联心电图',
      price: 20,
      status: 'pending',
      clinicalReason: '心悸待查',
      createdAt: '2026/9/25 08:06:00',
    },
  ],
  prescriptions: [prescription],
  medicalRecord: null,
  cdsReminders: [],
};

const oralDrug: DrugInfo = {
  drugId: 'DRG001',
  genericName: '酒石酸美托洛尔片',
  pinyin: 'jssmtelp',
  spec: '25mg',
  dosageForm: '片剂',
  manufacturer: '阿斯利康',
  unit: '盒',
  price: 15.5,
  stock: 100,
  antibiotics: false,
  highRisk: false,
};

const injectDrug: DrugInfo = {
  drugId: 'DRG002',
  genericName: '盐酸胺碘酮注射液',
  pinyin: 'ysdatzy',
  spec: '5ml',
  dosageForm: '注射液',
  manufacturer: '赛诺菲',
  unit: '支',
  price: 42,
  stock: 50,
  antibiotics: false,
  highRisk: true,
};

const stats: OutpatientStats = {
  todayRegistered: 6,
  todayVisited: 0,
  todayWaiting: 5,
  todayPassed: 0,
  avgWaitMinutes: 111,
  avgVisitMinutes: 0,
  prescriptionCount: 1,
  orderCount: 1,
  monthVisits: 100,
  monthPrescriptions: 50,
  monthRecords: 40,
  avgPrescriptionFee: 12.5,
};

const recordContent: RecordContent = {
  chiefComplaint: '活动后气促',
  presentIllness: '双下肢水肿 2 周',
  pastHistory: '原发性高血压',
  physicalExam: '心率 92 次/分',
  auxiliaryExam: '心电图提示室上速',
  diagnosis: '阵发性室上性心动过速 I47.100',
  treatment: '美托洛尔控制心率',
  healthEducation: '避免劳累，规律服药',
};

const initialState = useOutpatientStore.getState();

beforeEach(() => {
  useOutpatientStore.setState({ ...initialState });
  useAuthStore.getState().logout();
  vi.mocked(opApi.getQueue).mockResolvedValue([waiting]);
  vi.mocked(opApi.getEncounter).mockResolvedValue(bundle);
  vi.mocked(opApi.saveConsultation).mockResolvedValue(bundle);
  vi.mocked(opApi.addDiagnosis).mockResolvedValue(bundle);
  vi.mocked(opApi.confirmDiagnosis).mockResolvedValue(bundle);
  vi.mocked(opApi.removeDiagnosis).mockResolvedValue(bundle);
  vi.mocked(opApi.addOrder).mockResolvedValue(bundle);
  vi.mocked(opApi.cancelOrder).mockResolvedValue(bundle);
  vi.mocked(opApi.submitPrescription).mockResolvedValue(bundle);
  vi.mocked(opApi.auditPrescription).mockResolvedValue(bundle);
  vi.mocked(opApi.saveRecord).mockResolvedValue(bundle);
  vi.mocked(opApi.getStats).mockResolvedValue(stats);
  vi.mocked(aiApi.createAiConversation).mockResolvedValue({
    id: 'conv-1',
    title: '门诊对话·李*',
    patientId: patient.patientId,
    metadata: {},
  });
  vi.mocked(aiApi.getAiMessages).mockResolvedValue([]);
});

describe('outpatientStore 初始状态', () => {
  it('数据字段为初始空态', () => {
    const s = useOutpatientStore.getState();
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
    expect(s.queue).toEqual([]);
    expect(s.currentEncounterId).toBeNull();
    expect(s.activeTab).toBe('consult');
    expect(s.draftRxLines).toEqual([]);
    expect(s.prescriptions).toEqual([]);
    expect(s.diagnoses).toEqual([]);
    expect(s.orders).toEqual([]);
    expect(s.aiStreaming).toBe(false);
    expect(s.aiConversationId).toBeNull();
  });
});

describe('outpatientStore 本地 UI 状态', () => {
  it('setActiveTab 切换工作台标签', () => {
    useOutpatientStore.getState().setActiveTab('diagnosis');
    expect(useOutpatientStore.getState().activeTab).toBe('diagnosis');
  });

  it('setQueueSearch 设置检索关键词', () => {
    useOutpatientStore.getState().setQueueSearch('王');
    expect(useOutpatientStore.getState().queueSearch).toBe('王');
  });
});

describe('outpatientStore 候诊队列', () => {
  it('fetchWaitingQueue 成功填充队列', async () => {
    await useOutpatientStore.getState().fetchWaitingQueue();
    const s = useOutpatientStore.getState();
    expect(s.queue).toHaveLength(1);
    expect(s.queue[0].encounterId).toBe('enc-1');
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
  });

  it('fetchWaitingQueue 失败设置错误且不造假数据', async () => {
    vi.mocked(opApi.getQueue).mockRejectedValueOnce(new Error('队列加载失败'));
    await useOutpatientStore.getState().fetchWaitingQueue();
    const s = useOutpatientStore.getState();
    expect(s.error).toBe('队列加载失败');
    expect(s.loading).toBe(false);
    expect(s.queue).toEqual([]);
  });
});

describe('outpatientStore 开始/加载就诊', () => {
  it('startConsultation 标记就诊中并加载完整快照与 AI 会话', async () => {
    useOutpatientStore.setState({ queue: [waiting] });
    await useOutpatientStore.getState().startConsultation('enc-1');
    const s = useOutpatientStore.getState();
    expect(s.queue[0].status).toBe('in_consult');
    expect(s.currentEncounterId).toBe('enc-1');
    expect(s.currentPatient?.nameMasked).toBe('李*');
    expect(s.diagnoses).toHaveLength(1);
    expect(s.prescriptions).toHaveLength(1);
    expect(s.prescriptions[0].status).toBe('pending_review');
    expect(s.aiConversationId).toBe('conv-1');
    expect(vi.mocked(aiApi.createAiConversation)).toHaveBeenCalled();
  });

  it('loadEncounter 失败设置错误', async () => {
    vi.mocked(opApi.getEncounter).mockRejectedValueOnce(new Error('快照加载失败'));
    await useOutpatientStore.getState().loadEncounter('enc-1');
    const s = useOutpatientStore.getState();
    expect(s.error).toBe('快照加载失败');
    expect(s.loading).toBe(false);
  });

  it('clearEncounter 清空当前就诊上下文', async () => {
    await useOutpatientStore.getState().loadEncounter('enc-1');
    useOutpatientStore.getState().clearEncounter();
    const s = useOutpatientStore.getState();
    expect(s.currentEncounterId).toBeNull();
    expect(s.currentPatient).toBeNull();
    expect(s.diagnoses).toEqual([]);
    expect(s.aiConversationId).toBeNull();
  });
});

describe('outpatientStore 问诊保存', () => {
  it('无当前就诊时返回 false', async () => {
    expect(await useOutpatientStore.getState().saveConsultation({ chiefComplaint: 'x' })).toBe(
      false,
    );
    expect(vi.mocked(opApi.saveConsultation)).not.toHaveBeenCalled();
  });

  it('加载后保存问诊调用服务并返回 true', async () => {
    await useOutpatientStore.getState().loadEncounter('enc-1');
    const ok = await useOutpatientStore.getState().saveConsultation({ chiefComplaint: '心悸' });
    expect(ok).toBe(true);
    expect(vi.mocked(opApi.saveConsultation)).toHaveBeenCalledWith(
      'enc-1',
      expect.objectContaining({ chiefComplaint: '心悸' }),
    );
  });
});

describe('outpatientStore 诊断', () => {
  it('无当前就诊时 addDiagnosis 为 no-op', async () => {
    await useOutpatientStore.getState().addDiagnosis({ name: '测试' });
    expect(vi.mocked(opApi.addDiagnosis)).not.toHaveBeenCalled();
  });

  it('加载后 addDiagnosis 调用服务', async () => {
    await useOutpatientStore.getState().loadEncounter('enc-1');
    await useOutpatientStore.getState().addDiagnosis({ name: '测试诊断' });
    expect(vi.mocked(opApi.addDiagnosis)).toHaveBeenCalledWith(
      'enc-1',
      expect.objectContaining({ name: '测试诊断' }),
    );
  });

  it('加载后 confirmDiagnosis / removeDiagnosis 调用服务', async () => {
    await useOutpatientStore.getState().loadEncounter('enc-1');
    await useOutpatientStore.getState().confirmDiagnosis('d1', true);
    expect(vi.mocked(opApi.confirmDiagnosis)).toHaveBeenCalledWith('enc-1', 'd1', true);
    await useOutpatientStore.getState().removeDiagnosis('d1');
    expect(vi.mocked(opApi.removeDiagnosis)).toHaveBeenCalledWith('enc-1', 'd1');
  });
});

describe('outpatientStore 医嘱', () => {
  it('无当前就诊时 addOrder 为 no-op', async () => {
    await useOutpatientStore
      .getState()
      .addOrder({ kind: 'lab', catalogId: 'c', name: 'n', price: 1, clinicalReason: 'r' });
    expect(vi.mocked(opApi.addOrder)).not.toHaveBeenCalled();
  });

  it('加载后 addOrder / cancelOrder 调用服务', async () => {
    await useOutpatientStore.getState().loadEncounter('enc-1');
    await useOutpatientStore
      .getState()
      .addOrder({ kind: 'lab', catalogId: 'lab-ecg', name: '心电图', price: 20, clinicalReason: '心悸' });
    expect(vi.mocked(opApi.addOrder)).toHaveBeenCalledWith(
      'enc-1',
      expect.objectContaining({ kind: 'lab' }),
    );
    await useOutpatientStore.getState().cancelOrder('ord-1');
    expect(vi.mocked(opApi.cancelOrder)).toHaveBeenCalledWith('enc-1', 'ord-1', '医师撤销');
  });
});

describe('outpatientStore 处方草稿（本地）', () => {
  it('addDraftLine 口服药派生 tid/po/mg 与小计', () => {
    useOutpatientStore.getState().addDraftLine(oralDrug);
    const line = useOutpatientStore.getState().draftRxLines[0];
    expect(line.frequency).toBe('tid');
    expect(line.route).toBe('po');
    expect(line.doseUnit).toBe('mg');
    expect(line.subtotal).toBe(15.5);
  });

  it('addDraftLine 注射剂派生 ivgtt/ml', () => {
    useOutpatientStore.getState().addDraftLine(injectDrug);
    const line = useOutpatientStore.getState().draftRxLines[0];
    expect(line.route).toBe('ivgtt');
    expect(line.doseUnit).toBe('ml');
  });

  it('updateDraftLine 修改数量重算小计', () => {
    useOutpatientStore.getState().addDraftLine(oralDrug);
    const id = useOutpatientStore.getState().draftRxLines[0].lineId;
    useOutpatientStore.getState().updateDraftLine(id, { quantity: 2 });
    expect(useOutpatientStore.getState().draftRxLines[0].subtotal).toBe(31);
  });

  it('removeDraftLine / clearDraft 清空草稿', () => {
    useOutpatientStore.getState().addDraftLine(oralDrug);
    const id = useOutpatientStore.getState().draftRxLines[0].lineId;
    useOutpatientStore.getState().removeDraftLine(id);
    expect(useOutpatientStore.getState().draftRxLines).toEqual([]);
    useOutpatientStore.getState().addDraftLine(oralDrug);
    useOutpatientStore.getState().addDraftLine(injectDrug);
    useOutpatientStore.getState().clearDraft();
    expect(useOutpatientStore.getState().draftRxLines).toEqual([]);
  });

  it('applyTemplateToDraft 追加模板行并计算小计', () => {
    useOutpatientStore.getState().applyTemplateToDraft([{ drug: oralDrug, quantity: 3 }]);
    const line = useOutpatientStore.getState().draftRxLines[0];
    expect(line.quantity).toBe(3);
    expect(line.subtotal).toBe(46.5);
  });
});

describe('outpatientStore 提交处方', () => {
  it('无就诊或空草稿返回 false', async () => {
    expect(await useOutpatientStore.getState().submitDraftPrescription()).toBe(false);
    await useOutpatientStore.getState().loadEncounter('enc-1');
    expect(useOutpatientStore.getState().draftRxLines).toEqual([]);
    expect(await useOutpatientStore.getState().submitDraftPrescription()).toBe(false);
  });

  it('有草稿提交成功后清空草稿', async () => {
    await useOutpatientStore.getState().loadEncounter('enc-1');
    useOutpatientStore.getState().addDraftLine(oralDrug);
    expect(await useOutpatientStore.getState().submitDraftPrescription()).toBe(true);
    const call = vi.mocked(opApi.submitPrescription).mock.calls[0];
    expect(call[0]).toBe('enc-1');
    expect((call[1] as { lines: unknown[] }).lines).toHaveLength(1);
    expect(useOutpatientStore.getState().draftRxLines).toEqual([]);
  });

  it('提交失败返回 false、设置错误且保留草稿', async () => {
    await useOutpatientStore.getState().loadEncounter('enc-1');
    useOutpatientStore.getState().addDraftLine(oralDrug);
    vi.mocked(opApi.submitPrescription).mockRejectedValueOnce(new Error('审方未通过：相互作用'));
    expect(await useOutpatientStore.getState().submitDraftPrescription()).toBe(false);
    expect(useOutpatientStore.getState().error).toContain('审方未通过');
    expect(useOutpatientStore.getState().draftRxLines).toHaveLength(1);
  });
});

describe('outpatientStore 药师审核', () => {
  it('无当前就诊时为 no-op', async () => {
    await useOutpatientStore.getState().auditPrescription('rx-1', 'approved', '通过');
    expect(vi.mocked(opApi.auditPrescription)).not.toHaveBeenCalled();
  });

  it('加载后审核调用服务', async () => {
    await useOutpatientStore.getState().loadEncounter('enc-1');
    await useOutpatientStore.getState().auditPrescription('rx-1', 'approved', '审核通过');
    expect(vi.mocked(opApi.auditPrescription)).toHaveBeenCalledWith('enc-1', 'rx-1', {
      decision: 'approved',
      comment: '审核通过',
    });
  });
});

describe('outpatientStore 病历', () => {
  it('无当前就诊时 saveRecord 为 no-op', async () => {
    await useOutpatientStore.getState().saveRecord(recordContent);
    expect(vi.mocked(opApi.saveRecord)).not.toHaveBeenCalled();
  });

  it('加载后保存病历调用服务', async () => {
    await useOutpatientStore.getState().loadEncounter('enc-1');
    await useOutpatientStore.getState().saveRecord(recordContent, false);
    expect(vi.mocked(opApi.saveRecord)).toHaveBeenCalledWith(
      'enc-1',
      expect.objectContaining({ signed: false }),
    );
  });
});

describe('outpatientStore 统计', () => {
  it('fetchStats 填充统计', async () => {
    await useOutpatientStore.getState().fetchStats();
    expect(useOutpatientStore.getState().stats?.todayRegistered).toBe(6);
  });

  it('fetchStats 失败设置错误', async () => {
    vi.mocked(opApi.getStats).mockRejectedValueOnce(new Error('统计加载失败'));
    await useOutpatientStore.getState().fetchStats();
    expect(useOutpatientStore.getState().error).toBe('统计加载失败');
  });
});

describe('outpatientStore 结束就诊 / 队列状态', () => {
  it('无当前就诊时 finishEncounter 为 no-op', async () => {
    await useOutpatientStore.getState().finishEncounter();
    expect(useOutpatientStore.getState().currentEncounterId).toBeNull();
  });

  it('finishEncounter 标记已诊并清空上下文', async () => {
    useOutpatientStore.setState({ queue: [waiting] });
    await useOutpatientStore.getState().startConsultation('enc-1');
    await useOutpatientStore.getState().finishEncounter();
    const s = useOutpatientStore.getState();
    expect(s.queue[0].status).toBe('visited');
    expect(s.currentEncounterId).toBeNull();
  });

  it('markQueueStatus 更新队列状态', () => {
    useOutpatientStore.setState({ queue: [waiting] });
    useOutpatientStore.getState().markQueueStatus('enc-1', 'passed');
    expect(useOutpatientStore.getState().queue[0].status).toBe('passed');
  });
});

describe('outpatientStore 医生会话同步', () => {
  it('未登录时 syncDoctorFromAuth 不设置医生', () => {
    useOutpatientStore.getState().syncDoctorFromAuth();
    expect(useOutpatientStore.getState().doctor).toBeNull();
  });

  it('登录后 syncDoctorFromAuth 映射医生会话', () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        username: 'doctor_chen',
        realName: '陈医生',
        title: '主任医师',
        deptName: '心血管内科',
      } as never,
    });
    useOutpatientStore.getState().syncDoctorFromAuth();
    const doctor = useOutpatientStore.getState().doctor;
    expect(doctor?.doctorName).toBe('陈医生');
    expect(doctor?.title).toBe('主任医师');
    expect(doctor?.deptName).toBe('心血管内科');
  });
});

describe('outpatientStore AI 会话', () => {
  it('无就诊时 initAiConversation 不创建会话', async () => {
    await useOutpatientStore.getState().initAiConversation();
    expect(vi.mocked(aiApi.createAiConversation)).not.toHaveBeenCalled();
  });

  it('加载后以患者名义初始化会话', async () => {
    await useOutpatientStore.getState().loadEncounter('enc-1');
    expect(vi.mocked(aiApi.createAiConversation)).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('李*'), encounterId: 'enc-1' }),
    );
  });

  it('无会话时 sendAiMessage 不发起流式请求', async () => {
    await useOutpatientStore.getState().sendAiMessage('你好');
    expect(vi.mocked(aiApi.streamAiMessage)).not.toHaveBeenCalled();
  });

  it('resetAiError 清除 AI 错误', () => {
    useOutpatientStore.setState({ aiError: '初始化失败' });
    useOutpatientStore.getState().resetAiError();
    expect(useOutpatientStore.getState().aiError).toBeNull();
  });
});
