/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 问诊表单：主诉 / 现病史 / 既往史 / 个人家族史 / 体格检查 / 辅助检查。
 * 支持结构化模板、生命体征自动填充、30s 自动保存、AI 辅助生成。
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Collapse,
  Divider,
  Input,
  Row,
  Col,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { RobotOutlined, SaveOutlined, PlusOutlined, HeartOutlined } from '@ant-design/icons';
import type { ConsultationRecord, PresentIllness, VitalSigns } from '@/types/outpatient';
import { useOutpatientStore } from '@/store/outpatientStore';

const { TextArea } = Input;
const { Text } = Typography;

/** 字段标签 + 必填 */
const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({
  label,
  required,
  children,
}) => (
  <div className="mb-3">
    <div className="text-xs text-ink-secondary mb-1">
      {required && <span className="text-medical-critical mr-0.5">*</span>}
      {label}
    </div>
    {children}
  </div>
);

export const ConsultationForm: React.FC = () => {
  const consultation = useOutpatientStore((s) => s.consultation);
  const currentPatient = useOutpatientStore((s) => s.currentPatient);
  const saveConsultation = useOutpatientStore((s) => s.saveConsultation);
  const addAuxExam = useOutpatientStore((s) => s.addAuxExam);
  const [savedTip, setSavedTip] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 本地草稿（与 store 同步）
  const [draft, setDraft] = useState<ConsultationRecord | null>(consultation);
  useEffect(() => setDraft(consultation), [consultation]);

  // 自动保存：每 30s 将草稿回写 store
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (draft) {
        saveConsultation({ ...draft });
        setSavedTip(`已自动保存 ${new Date().toLocaleTimeString('zh-CN')}`);
      }
    }, 30000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [draft, saveConsultation]);

  if (!draft) {
    return (
      <Card size="small">
        <Text type="secondary">请从左侧候诊队列选择患者开始问诊</Text>
      </Card>
    );
  }

  const patchPI = (key: keyof PresentIllness, val: string) =>
    setDraft((d) => (d ? { ...d, presentIllness: { ...d.presentIllness, [key]: val } } : d));

  const patchVital = (key: keyof VitalSigns, val: number | undefined) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            physicalExam: { ...d.physicalExam, vital: { ...d.physicalExam.vital, [key]: val } },
          }
        : d,
    );

  /** AI 辅助：根据主诉生成现病史 */
  const aiFillHistory = () => {
    const cc = draft.chiefComplaint || '不适';
    setDraft((d) =>
      d
        ? {
            ...d,
            presentIllness: {
              onsetTime: '【AI】数日前',
              trigger: '【AI】活动/情绪激动后',
              mainSymptom: `【AI】患者诉${cc}，呈持续性/阵发性`,
              accompanying: '【AI】伴乏力、出汗，无放射痛',
              treatmentProcess: '【AI】未自行特殊处理，为求进一步诊治来院',
              generalCondition: '【AI】精神欠佳，饮食睡眠可，二便正常',
            },
          }
        : d,
    );
    message.success('AI 已根据主诉生成现病史草稿，请核对修改');
  };

  /** 一键填充生命体征 */
  const fillVitalsFromPatient = () => {
    if (!currentPatient?.vitalSigns) {
      message.warning('患者无生命体征记录');
      return;
    }
    setDraft((d) =>
      d
        ? {
            ...d,
            physicalExam: { ...d.physicalExam, vital: { ...currentPatient.vitalSigns } },
          }
        : d,
    );
    message.success('已从患者 360 摘要填充生命体征');
  };

  const v = draft.physicalExam.vital ?? {};

  return (
    <div className="space-y-3">
      {/* 顶部操作条 */}
      <div className="flex items-center justify-between">
        <Space>
          <Button size="small" icon={<RobotOutlined />} onClick={aiFillHistory}>
            AI 生成现病史
          </Button>
          <Button size="small" icon={<HeartOutlined />} onClick={fillVitalsFromPatient}>
            带入生命体征
          </Button>
        </Space>
        <Space size="small">
          <Text type="secondary" className="text-xs">
            {savedTip}
          </Text>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<SaveOutlined />}
            onClick={() => {
              saveConsultation({ ...draft });
              message.success('问诊记录已保存');
            }}
          >
            保存
          </Button>
        </Space>
      </div>

      {/* 主诉 */}
      <Card size="small" title={<span className="text-sm font-semibold">主诉</span>}>
        <Field label="主诉（不超过 20 字）" required>
          <Input
            value={draft.chiefComplaint}
            maxLength={20}
            showCount
            onChange={(e) => setDraft((d) => (d ? { ...d, chiefComplaint: e.target.value } : d))}
            placeholder="如：反复胸闷、心悸 1 周，加重 1 天"
          />
        </Field>
      </Card>

      {/* 现病史 */}
      <Card size="small" title={<span className="text-sm font-semibold">现病史</span>}>
        <Row gutter={12}>
          <Col span={8}>
            <Field label="起病时间">
              <Input
                value={draft.presentIllness.onsetTime}
                onChange={(e) => patchPI('onsetTime', e.target.value)}
              />
            </Field>
          </Col>
          <Col span={8}>
            <Field label="诱因">
              <Input
                value={draft.presentIllness.trigger}
                onChange={(e) => patchPI('trigger', e.target.value)}
              />
            </Field>
          </Col>
          <Col span={8}>
            <Field label="一般情况">
              <Input
                value={draft.presentIllness.generalCondition}
                onChange={(e) => patchPI('generalCondition', e.target.value)}
              />
            </Field>
          </Col>
        </Row>
        <Field label="主要症状" required>
          <TextArea
            rows={2}
            value={draft.presentIllness.mainSymptom}
            onChange={(e) => patchPI('mainSymptom', e.target.value)}
          />
        </Field>
        <Field label="伴随症状">
          <TextArea
            rows={2}
            value={draft.presentIllness.accompanying}
            onChange={(e) => patchPI('accompanying', e.target.value)}
          />
        </Field>
        <Field label="诊疗经过">
          <TextArea
            rows={2}
            value={draft.presentIllness.treatmentProcess}
            onChange={(e) => patchPI('treatmentProcess', e.target.value)}
          />
        </Field>
      </Card>

      {/* 既往史 */}
      <Card size="small" title={<span className="text-sm font-semibold">既往史</span>}>
        <Row gutter={12}>
          <Col span={12}>
            <Field label="既往疾病">
              <TextArea
                rows={2}
                value={draft.pastHistory.diseases}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, pastHistory: { ...d.pastHistory, diseases: e.target.value } } : d,
                  )
                }
              />
            </Field>
          </Col>
          <Col span={12}>
            <Field label="手术史">
              <TextArea
                rows={2}
                value={draft.pastHistory.surgery}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, pastHistory: { ...d.pastHistory, surgery: e.target.value } } : d,
                  )
                }
              />
            </Field>
          </Col>
          <Col span={12}>
            <Field label="外伤史 / 输血史">
              <TextArea
                rows={2}
                value={`${draft.pastHistory.trauma ?? ''} / ${draft.pastHistory.transfusion ?? ''}`}
                onChange={(e) => {
                  const [tr = '', tf = ''] = e.target.value.split('/');
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          pastHistory: {
                            ...d.pastHistory,
                            trauma: tr.trim(),
                            transfusion: tf.trim(),
                          },
                        }
                      : d,
                  );
                }}
              />
            </Field>
          </Col>
          <Col span={12}>
            <Field label="过敏史">
              <TextArea
                rows={2}
                value={draft.pastHistory.allergy}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, pastHistory: { ...d.pastHistory, allergy: e.target.value } } : d,
                  )
                }
              />
            </Field>
          </Col>
        </Row>
        {currentPatient?.allergies && currentPatient.allergies.length > 0 && (
          <div className="mb-2">
            <Tag color="red">已知过敏：{currentPatient.allergies.join('、')}</Tag>
          </div>
        )}
      </Card>

      {/* 个人史/家族史（折叠） */}
      <Collapse
        size="small"
        items={[
          {
            key: 'pfh',
            label: '个人史 / 家族史',
            children: (
              <TextArea
                rows={3}
                value={draft.personalFamilyHistory ?? ''}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, personalFamilyHistory: e.target.value } : d))
                }
                placeholder="烟酒嗜好、职业暴露、家族遗传病史等"
              />
            ),
          },
        ]}
      />

      {/* 体格检查 */}
      <Card size="small" title={<span className="text-sm font-semibold">体格检查</span>}>
        <Row gutter={8} className="mb-3">
          {[
            { k: 'temperature' as const, label: '体温℃', unit: '℃' },
            { k: 'pulse' as const, label: '脉搏', unit: '次/分' },
            { k: 'respiration' as const, label: '呼吸', unit: '次/分' },
            { k: 'systolic' as const, label: '收缩压', unit: 'mmHg' },
            { k: 'diastolic' as const, label: '舒张压', unit: 'mmHg' },
            { k: 'spo2' as const, label: 'SpO2', unit: '%' },
          ].map((it) => (
            <Col span={4} key={it.k}>
              <div className="text-xs text-ink-secondary">{it.label}</div>
              <Input
                size="small"
                type="number"
                value={v[it.k] ?? ''}
                onChange={(e) =>
                  patchVital(it.k, e.target.value === '' ? undefined : Number(e.target.value))
                }
                suffix={it.unit}
              />
            </Col>
          ))}
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Field label="一般情况">
              <TextArea
                rows={2}
                value={draft.physicalExam.general}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, physicalExam: { ...d.physicalExam, general: e.target.value } } : d,
                  )
                }
              />
            </Field>
          </Col>
          <Col span={12}>
            <Field label="皮肤黏膜 / 淋巴结">
              <TextArea
                rows={2}
                value={draft.physicalExam.skinLymph}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? { ...d, physicalExam: { ...d.physicalExam, skinLymph: e.target.value } }
                      : d,
                  )
                }
              />
            </Field>
          </Col>
          <Col span={12}>
            <Field label="胸部（心肺）" required>
              <TextArea
                rows={2}
                value={draft.physicalExam.chest}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, physicalExam: { ...d.physicalExam, chest: e.target.value } } : d,
                  )
                }
              />
            </Field>
          </Col>
          <Col span={12}>
            <Field label="腹部">
              <TextArea
                rows={2}
                value={draft.physicalExam.abdomen}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, physicalExam: { ...d.physicalExam, abdomen: e.target.value } } : d,
                  )
                }
              />
            </Field>
          </Col>
          <Col span={12}>
            <Field label="头颈部">
              <TextArea
                rows={2}
                value={draft.physicalExam.headNeck}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, physicalExam: { ...d.physicalExam, headNeck: e.target.value } } : d,
                  )
                }
              />
            </Field>
          </Col>
          <Col span={12}>
            <Field label="四肢脊柱 / 神经">
              <TextArea
                rows={2}
                value={`${draft.physicalExam.extremities ?? ''} / ${draft.physicalExam.neuro ?? ''}`}
                onChange={(e) => {
                  const [ex = '', ne = ''] = e.target.value.split('/');
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          physicalExam: {
                            ...d.physicalExam,
                            extremities: ex.trim(),
                            neuro: ne.trim(),
                          },
                        }
                      : d,
                  );
                }}
              />
            </Field>
          </Col>
        </Row>
      </Card>

      {/* 辅助检查 */}
      <Card
        size="small"
        title={<span className="text-sm font-semibold">辅助检查</span>}
        extra={
          <Button
            size="small"
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => {
              addAuxExam({
                id: `AX${Date.now()}`,
                name: '新增加检查',
                date: new Date().toLocaleString('zh-CN'),
                conclusion: '',
              });
              message.info('已新增辅助检查记录，请编辑结论');
            }}
          >
            添加
          </Button>
        }
      >
        {draft.auxiliaryExams.length === 0 && <Text type="secondary">暂无辅助检查结果</Text>}
        {draft.auxiliaryExams.map((ax) => (
          <div key={ax.id} className="mb-2 p-2 bg-gray-50 rounded">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">{ax.name}</span>
              <span className="text-ink-secondary">{ax.date}</span>
            </div>
            <div className="text-sm">
              {ax.conclusion || <Text type="secondary">（未填写结论）</Text>}
            </div>
          </div>
        ))}
      </Card>

      <Divider style={{ margin: '8px 0' }} />
      <div className="text-xs text-ink-secondary">
        最近保存：{draft.updatedAt} · 带 <span className="text-medical-critical">*</span>{' '}
        为必填项，表单每 30 秒自动保存
      </div>
    </div>
  );
};

export default ConsultationForm;
