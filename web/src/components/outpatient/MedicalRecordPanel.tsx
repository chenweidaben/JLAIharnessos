/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 门诊病历书写：结构化自动带出、AI 生成、质控检查、电子签名、打印。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Descriptions, Modal, Segmented, Space, Tag, message } from 'antd';
import {
  PrinterOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import type { RecordContent, RecordQualityIssue } from '@/types/outpatient';
import { useOutpatientStore } from '@/store/outpatientStore';
import { mockRecordTemplates } from '@/mock/outpatientMock';

/** 质控：检查必填/逻辑 */
function qualityCheck(content: RecordContent): RecordQualityIssue[] {
  const issues: RecordQualityIssue[] = [];
  if (!content.chiefComplaint.trim())
    issues.push({ level: 'danger', field: 'chiefComplaint', message: '主诉不能为空' });
  if (content.chiefComplaint.length > 20)
    issues.push({ level: 'warning', field: 'chiefComplaint', message: '主诉超过 20 字，建议精简' });
  if (!content.presentIllness.trim())
    issues.push({ level: 'danger', field: 'presentIllness', message: '现病史不能为空' });
  if (!content.physicalExam.trim())
    issues.push({ level: 'warning', field: 'physicalExam', message: '体格检查未记录' });
  if (!content.diagnosis.trim())
    issues.push({ level: 'danger', field: 'diagnosis', message: '诊断不能为空' });
  if (!content.treatment.trim())
    issues.push({ level: 'warning', field: 'treatment', message: '处理意见为空' });
  if (content.presentIllness.includes('【AI】') && content.presentIllness.length < 30)
    issues.push({
      level: 'info',
      field: 'presentIllness',
      message: '现病史为 AI 草稿，建议人工核对补充',
    });
  return issues;
}

export const MedicalRecordPanel: React.FC = () => {
  const consultation = useOutpatientStore((s) => s.consultation);
  const diagnoses = useOutpatientStore((s) => s.diagnoses);
  const prescriptions = useOutpatientStore((s) => s.prescriptions);
  const orders = useOutpatientStore((s) => s.orders);
  const doctor = useOutpatientStore((s) => s.doctor);

  const [content, setContent] = useState<RecordContent>({
    chiefComplaint: '',
    presentIllness: '',
    pastHistory: '',
    physicalExam: '',
    auxiliaryExam: '',
    diagnosis: '',
    treatment: '',
    healthEducation: '',
  });
  const [signed, setSigned] = useState(false);
  const [sigModal, setSigModal] = useState(false);
  const [scope, setScope] = useState<'personal' | 'dept' | 'common'>('dept');

  /** 自动从问诊/诊断/处方/申请带出 */
  useEffect(() => {
    if (!consultation) return;
    const ci = consultation;
    setContent({
      chiefComplaint: ci.chiefComplaint,
      presentIllness: [
        `患者于${ci.presentIllness.onsetTime ?? ''}出现${ci.presentIllness.mainSymptom ?? ''}，`,
        `诱因：${ci.presentIllness.trigger ?? '未明'}。`,
        `伴随症状：${ci.presentIllness.accompanying ?? '无'}。`,
        `诊疗经过：${ci.presentIllness.treatmentProcess ?? '未特殊处理'}。`,
        `一般情况：${ci.presentIllness.generalCondition ?? '可'}。`,
      ].join(''),
      pastHistory: `${ci.pastHistory.diseases ?? ''}；手术史：${ci.pastHistory.surgery ?? '否认'}；过敏史：${ci.pastHistory.allergy ?? '否认'}。`,
      physicalExam: [
        `T ${ci.physicalExam.vital?.temperature ?? '-'}℃ P ${ci.physicalExam.vital?.pulse ?? '-'}次/分 R ${ci.physicalExam.vital?.respiration ?? '-'}次/分 BP ${ci.physicalExam.vital?.systolic ?? '-'}/${ci.physicalExam.vital?.diastolic ?? '-'}mmHg。`,
        ci.physicalExam.general ?? '',
        ci.physicalExam.chest ?? '',
        ci.physicalExam.abdomen ?? '',
      ]
        .filter(Boolean)
        .join(' '),
      auxiliaryExam: ci.auxiliaryExams
        .map((a) => `${a.name}（${a.date}）：${a.conclusion}`)
        .join('；'),
      diagnosis: diagnoses.map((d) => `${d.name}（${d.code}）`).join('；'),
      treatment: [
        prescriptions[0]?.lines.length
          ? `处方：${prescriptions[0].lines.map((l) => l.drug.genericName).join('、')}`
          : '',
        orders.length ? `检查检验：${orders.map((o) => o.name).join('、')}` : '',
        '复诊建议：2 周后心内科门诊随访。',
      ]
        .filter(Boolean)
        .join('；'),
      healthEducation: '低盐低脂糖尿病饮食，戒烟限酒，规律作息，按时服药，监测血压心率，不适随诊。',
    });
  }, [consultation, diagnoses, prescriptions, orders]);

  const issues = useMemo(() => qualityCheck(content), [content]);
  const dangerCount = issues.filter((i) => i.level === 'danger').length;

  const set = (k: keyof RecordContent, v: string) => setContent((c) => ({ ...c, [k]: v }));

  const aiGenerate = () => {
    setContent((c) => ({
      ...c,
      presentIllness:
        c.presentIllness ||
        '患者诉反复胸闷心悸 1 周，加重 1 天，活动后明显，休息稍缓解。伴出汗乏力，无放射痛。为求进一步诊治来院。',
      treatment:
        c.treatment || '完善心电图、心肌酶谱；抗血小板、调脂、控制心率治疗；必要时住院造影。',
      healthEducation:
        c.healthEducation || '低盐低脂糖尿病饮食，戒烟限酒，按时服药，监测血压，2 周后复诊。',
    }));
    message.success('AI 已生成完整门诊病历，请人工核对后签名');
  };

  const applyTemplate = (tplId: string) => {
    const tpl = mockRecordTemplates.find((t) => t.templateId === tplId);
    if (!tpl) return;
    setContent((c) => ({ ...c, ...tpl.content }));
    message.success(`已套用模板：${tpl.name}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Space>
          <Segmented
            size="small"
            value={scope}
            onChange={(v) => setScope(v as typeof scope)}
            options={[
              { value: 'personal', label: '个人模板' },
              { value: 'dept', label: '科室模板' },
              { value: 'common', label: '通用模板' },
            ]}
          />
          <Button size="small" onClick={() => applyTemplate(mockRecordTemplates[0].templateId)}>
            套用模板
          </Button>
        </Space>
        <Space>
          <Button size="small" icon={<RobotOutlined />} onClick={aiGenerate}>
            AI 生成病历
          </Button>
          <Button
            size="small"
            icon={<SaveOutlined />}
            onClick={() => message.success('病历草稿已保存')}
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

      {/* 质控 */}
      <Alert
        type={dangerCount > 0 ? 'error' : 'success'}
        showIcon
        icon={<AuditOutlined />}
        message={`病历质控：${issues.length} 项提示，${dangerCount} 项必须修改`}
        description={
          issues.length > 0 ? (
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
          ) : (
            <span className="text-xs">病历完整规范，可签名提交。</span>
          )
        }
      />

      <Card
        size="small"
        title={<span className="text-sm font-semibold">门诊病历</span>}
        id="print-area"
      >
        <Descriptions size="small" column={2} bordered className="mb-3">
          <Descriptions.Item label="科室">{doctor.deptName}</Descriptions.Item>
          <Descriptions.Item label="医师">
            {doctor.doctorName}（{doctor.title}）
          </Descriptions.Item>
          <Descriptions.Item label="日期">
            {new Date().toLocaleDateString('zh-CN')}
          </Descriptions.Item>
          <Descriptions.Item label="病历完成度">
            <Tag color={dangerCount === 0 ? 'success' : 'warning'}>
              {dangerCount === 0 ? '完整' : '待完善'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>

        <RecordField
          label="主诉"
          value={content.chiefComplaint}
          onChange={(v) => set('chiefComplaint', v)}
          required
        />
        <RecordField
          label="现病史"
          value={content.presentIllness}
          onChange={(v) => set('presentIllness', v)}
          rows={4}
          required
        />
        <RecordField
          label="既往史"
          value={content.pastHistory}
          onChange={(v) => set('pastHistory', v)}
          rows={3}
        />
        <RecordField
          label="体格检查"
          value={content.physicalExam}
          onChange={(v) => set('physicalExam', v)}
          rows={3}
        />
        <RecordField
          label="辅助检查"
          value={content.auxiliaryExam}
          onChange={(v) => set('auxiliaryExam', v)}
          rows={2}
        />
        <RecordField
          label="诊断"
          value={content.diagnosis}
          onChange={(v) => set('diagnosis', v)}
          rows={2}
          required
        />
        <RecordField
          label="处理意见"
          value={content.treatment}
          onChange={(v) => set('treatment', v)}
          rows={3}
        />
        <RecordField
          label="健康宣教"
          value={content.healthEducation}
          onChange={(v) => set('healthEducation', v)}
          rows={2}
        />
      </Card>

      <Modal
        open={sigModal}
        title="电子签名确认"
        onCancel={() => setSigModal(false)}
        onOk={() => {
          setSigned(true);
          setSigModal(false);
          message.success('病历已签名归档');
        }}
        okText="确认签名归档"
      >
        <p className="text-sm">病历质控已通过，签名后将归档至患者健康档案，不可修改。</p>
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
