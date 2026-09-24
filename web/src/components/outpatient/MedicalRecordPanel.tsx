/**
 * 健澜科技 jlmedaios - 门诊病历书写面板（真实接口 + 真实 LLM）
 *
 * - 结构化内容由问诊/诊断/医嘱/处方自动带出（真实数据，非 mock）；
 * - “AI 生成病历”调用真实大模型，产物为 AI 草稿，必须医师核对；
 * - 存草稿 / 签名提交均真实落 clinical.medical_records，签名后不可在界面修改。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
} from 'antd';
import {
  PrinterOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  AuditOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type {
  RecordContent,
  RecordQualityIssue,
  RecordTemplate,
} from '@/types/outpatient';
import { useOutpatientStore } from '@/store/outpatientStore';
import {
  fetchRecordTemplates,
  generateAiRecordApi,
} from '@/services/api/outpatient';

const EMPTY_CONTENT: RecordContent = {
  chiefComplaint: '',
  presentIllness: '',
  pastHistory: '',
  physicalExam: '',
  auxiliaryExam: '',
  diagnosis: '',
  treatment: '',
  healthEducation: '',
};

/** 前端病历质控：必填与完整性提示 */
function qualityCheck(content: RecordContent): RecordQualityIssue[] {
  const issues: RecordQualityIssue[] = [];
  if (!content.chiefComplaint.trim())
    issues.push({ level: 'danger', field: 'chiefComplaint', message: '主诉不能为空' });
  if (!content.presentIllness.trim())
    issues.push({ level: 'danger', field: 'presentIllness', message: '现病史不能为空' });
  if (!content.physicalExam.trim())
    issues.push({ level: 'warning', field: 'physicalExam', message: '体格检查未记录' });
  if (!content.diagnosis.trim())
    issues.push({ level: 'danger', field: 'diagnosis', message: '诊断不能为空' });
  if (!content.treatment.trim())
    issues.push({ level: 'warning', field: 'treatment', message: '处理意见为空' });
  if (!content.pastHistory.trim())
    issues.push({ level: 'info', field: 'pastHistory', message: '既往史未记录' });
  return issues;
}

export const MedicalRecordPanel: React.FC = () => {
  const consultation = useOutpatientStore((s) => s.consultation);
  const diagnoses = useOutpatientStore((s) => s.diagnoses);
  const prescriptions = useOutpatientStore((s) => s.prescriptions);
  const orders = useOutpatientStore((s) => s.orders);
  const doctor = useOutpatientStore((s) => s.doctor);
  const medicalRecord = useOutpatientStore((s) => s.medicalRecord);
  const currentEncounterId = useOutpatientStore((s) => s.currentEncounterId);
  const saveRecordAction = useOutpatientStore((s) => s.saveRecord);

  const [content, setContent] = useState<RecordContent>(EMPTY_CONTENT);
  const [sigModal, setSigModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<RecordTemplate[]>([]);

  /** 依据真实就诊数据组装病历内容 */
  const buildFromEncounter = useCallback((): RecordContent => {
    const ci = consultation;
    if (!ci) return EMPTY_CONTENT;
    const pi = ci.presentIllness ?? {};
    const ph = ci.pastHistory ?? {};
    const pe = ci.physicalExam ?? {};
    const v = pe.vital;
    return {
      chiefComplaint: ci.chiefComplaint ?? '',
      presentIllness: [
        pi.mainSymptom ? `患者诉${pi.mainSymptom}` : '',
        pi.onsetTime ? `，起病于${pi.onsetTime}` : '',
        pi.trigger ? `，诱因：${pi.trigger}` : '',
        pi.accompanying ? `，伴${pi.accompanying}` : '',
        pi.treatmentProcess ? `。诊疗经过：${pi.treatmentProcess}` : '',
        pi.generalCondition ? `。一般情况：${pi.generalCondition}` : '',
        '。',
      ].join(''),
      pastHistory: [
        ph.diseases ? `既往疾病：${ph.diseases}` : '',
        ph.surgery ? `；手术史：${ph.surgery}` : '',
        ph.allergy ? `；过敏史：${ph.allergy}` : '',
      ].join(''),
      physicalExam: [
        v
          ? `T ${v.temperature ?? '-'}℃ P ${v.pulse ?? '-'}次/分 R ${v.respiration ?? '-'}次/分 BP ${v.systolic ?? '-'}/${v.diastolic ?? '-'}mmHg。`
          : '',
        pe.general ?? '',
        pe.chest ?? '',
        pe.abdomen ?? '',
      ]
        .filter(Boolean)
        .join(' '),
      auxiliaryExam: ci.auxiliaryExams
        .map((a) => `${a.name}：${a.conclusion}`)
        .join('；'),
      diagnosis: diagnoses
        .map((d) => (d.code ? `${d.name}（${d.code}）` : d.name))
        .join('；'),
      treatment: [
        prescriptions[0]
          ? `处方：${prescriptions[0].lines.map((l) => l.drug.genericName).join('、')}`
          : '',
        orders.length ? `检查检验：${orders.map((o) => o.name).join('、')}` : '',
      ]
        .filter(Boolean)
        .join('；'),
      healthEducation: '规律作息、合理膳食、按时服药，监测症状变化，定期门诊复诊，不适随诊。',
    };
  }, [consultation, diagnoses, prescriptions, orders]);

  // 就诊切换：载入已存病历，否则自动带出
  useEffect(() => {
    setAiError(null);
    setAiNote(null);
    if (!currentEncounterId) {
      setContent(EMPTY_CONTENT);
      return;
    }
    if (medicalRecord?.content) {
      setContent({ ...EMPTY_CONTENT, ...medicalRecord.content });
    } else {
      setContent(buildFromEncounter());
    }
    // 仅在就诊切换 / 已存病历首次到达时执行，避免打断录入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEncounterId, medicalRecord?.recordId]);

  // 病历模板
  useEffect(() => {
    let alive = true;
    fetchRecordTemplates()
      .then((list) => {
        if (alive) setTemplates(list);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const issues = useMemo(() => qualityCheck(content), [content]);
  const dangerCount = issues.filter((i) => i.level === 'danger').length;
  const signed = medicalRecord?.signed === true;

  const set = (k: keyof RecordContent, v: string): void => {
    if (signed) return;
    setContent((c) => ({ ...c, [k]: v }));
  };

  /** AI 生成病历（真实 LLM） */
  const aiGenerate = async (): Promise<void> => {
    if (!currentEncounterId || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setAiNote(null);
    try {
      const draft = await generateAiRecordApi(currentEncounterId);
      setContent((c) => {
        const merged = { ...c };
        for (const key of Object.keys(EMPTY_CONTENT) as (keyof RecordContent)[]) {
          const val = draft[key];
          if (typeof val === 'string' && val.trim()) merged[key] = val.trim();
        }
        return merged;
      });
      setAiNote('AI 已生成病历草稿，请逐段核对、修改后再签名（AI 辅助，医师负责）。');
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI 病历生成失败');
    } finally {
      setAiLoading(false);
    }
  };

  /** 套用病历模板 */
  const applyTemplate = (templateId: string): void => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setContent((c) => {
      const merged = { ...c };
      for (const [key, sec] of Object.entries(tpl.sections)) {
        if (key in merged && sec.template) {
          merged[key as keyof RecordContent] = sec.template;
        }
      }
      return merged;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Space>
          <Select
            size="small"
            style={{ width: 200 }}
            placeholder="选择病历模板"
            onChange={applyTemplate}
            options={templates.map((t) => ({ value: t.id, label: t.name }))}
          />
          <Button size="small" icon={<SyncOutlined />} onClick={() => setContent(buildFromEncounter())}>
            重新带出
          </Button>
        </Space>
        <Space>
          <Button size="small" icon={<RobotOutlined />} loading={aiLoading} onClick={() => void aiGenerate()}>
            AI 生成病历
          </Button>
          <Button
            size="small"
            icon={<SaveOutlined />}
            disabled={signed}
            onClick={() => void saveRecordAction(content, false)}
          >
            存草稿
          </Button>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => window.print()}>
            打印
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<SafetyCertificateOutlined />}
            disabled={dangerCount > 0 || signed}
            style={{ background: '#0A4D8C' }}
            onClick={() => setSigModal(true)}
          >
            {signed ? '已签名' : '签名提交'}
          </Button>
        </Space>
      </div>

      {aiLoading && (
        <div className="py-4 text-center">
          <Spin tip="AI 正在依据真实病历生成…" />
        </div>
      )}
      {aiNote && <Alert type="info" showIcon message={aiNote} />}
      {aiError && (
        <Alert
          type="error"
          showIcon
          message="AI 病历生成失败"
          description={aiError}
        />
      )}

      {/* 质控 */}
      <Alert
        type={signed ? 'success' : dangerCount > 0 ? 'error' : 'success'}
        showIcon
        icon={<AuditOutlined />}
        message={
          signed
            ? '病历已签名归档'
            : `病历质控：${issues.length} 项提示，${dangerCount} 项必须修改`
        }
        description={
          !signed && issues.length > 0 ? (
            <ul className="list-disc pl-5 text-xs">
              {issues.map((it, idx) => (
                <li
                  key={idx}
                  style={{
                    color:
                      it.level === 'danger'
                        ? '#F5222D'
                        : it.level === 'warning'
                          ? '#FA8C16'
                          : '#1890FF',
                  }}
                >
                  {it.message}
                </li>
              ))}
            </ul>
          ) : undefined
        }
      />

      <Card size="small" title={<span className="text-sm font-semibold">门诊病历</span>} id="print-area">
        <Descriptions size="small" column={2} bordered className="mb-3">
          <Descriptions.Item label="科室">{doctor?.deptName}</Descriptions.Item>
          <Descriptions.Item label="医师">
            {doctor?.doctorName}
            {doctor?.title ? `（${doctor.title}）` : ''}
          </Descriptions.Item>
          <Descriptions.Item label="日期">
            {new Date().toLocaleDateString('zh-CN')}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={signed ? 'success' : 'warning'}>
              {signed ? '已签名' : medicalRecord ? '草稿' : '未保存'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>

        <RecordField label="主诉" value={content.chiefComplaint} onChange={(v) => set('chiefComplaint', v)} required />
        <RecordField label="现病史" value={content.presentIllness} onChange={(v) => set('presentIllness', v)} rows={4} required />
        <RecordField label="既往史" value={content.pastHistory} onChange={(v) => set('pastHistory', v)} rows={3} />
        <RecordField label="体格检查" value={content.physicalExam} onChange={(v) => set('physicalExam', v)} rows={3} />
        <RecordField label="辅助检查" value={content.auxiliaryExam} onChange={(v) => set('auxiliaryExam', v)} rows={2} />
        <RecordField label="诊断" value={content.diagnosis} onChange={(v) => set('diagnosis', v)} rows={2} required />
        <RecordField label="处理意见" value={content.treatment} onChange={(v) => set('treatment', v)} rows={3} />
        <RecordField label="健康宣教" value={content.healthEducation} onChange={(v) => set('healthEducation', v)} rows={2} />
      </Card>

      <Modal
        open={sigModal}
        title="电子签名确认"
        onCancel={() => setSigModal(false)}
        onOk={() => {
          void saveRecordAction(content, true);
          setSigModal(false);
        }}
        okText="确认签名归档"
        okButtonProps={{ icon: <SafetyCertificateOutlined /> }}
      >
        <p className="text-sm">病历质控已通过，签名后将归档至患者健康档案，界面不可再修改。</p>
        <p className="text-xs text-ink-secondary">
          签名即表示医师已审核病历内容并对其真实性、完整性负责（AI 辅助，医师复核签名）。
        </p>
      </Modal>
    </div>
  );
};

const RecordField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  required?: boolean;
}> = ({ label, value, onChange, rows = 2, required }) => (
  <div className="mb-2">
    <div className="text-xs text-ink-secondary mb-1">
      {required && <span className="text-medical-critical mr-0.5">*</span>}
      {label}
    </div>
    <textarea
      className="w-full border border-ink-border rounded px-2 py-1 text-sm focus:outline-none focus:border-[#0A4D8C]"
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

export default MedicalRecordPanel;
