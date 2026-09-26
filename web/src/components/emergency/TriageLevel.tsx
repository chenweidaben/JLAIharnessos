/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 四级分诊表单：生命体征 / NEWS2 提示 / GCS / FAST·LAMS / AI 建议 / 护士确认级别
 * 提交后真实落库（POST /emergency/triage/:visitId）。
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Tag,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import clsx from 'clsx';

import { useEmergencyStore } from '@/store/emergencyStore';
import type {
  AiTriageAdviceDto,
  EmergencyQueueItem,
  TriageFormPayload,
  TriageLevel as Level,
} from '@/types/emergency';
import {
  FAST_META,
  GCS_META,
  LAMS_META,
  TRIAGE_LEVEL_META,
} from './constants';

const CONSCIOUSNESS_OPTIONS = [
  { value: 'alert', label: '清醒 (A)' },
  { value: 'verbal', label: '对声音有反应 (V)' },
  { value: 'pain', label: '对疼痛有反应 (P)' },
  { value: 'unresponsive', label: '无反应 (U)' },
];

export default function TriageLevel({ item }: { item: EmergencyQueueItem }) {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const { submitTriage, fetchAiAdvice, acting } = useEmergencyStore();
  const [form] = Form.useForm();
  const [ai, setAi] = useState<AiTriageAdviceDto | null>(null);
  const [level, setLevel] = useState<Level | null>(null);

  const initial = useMemo(
    () => ({
      chiefComplaint: item.chiefComplaint ?? '',
      consciousness: 'alert',
    }),
    [item],
  );

  /** 收集除 level 外的载荷（AI 建议 / 提交共用） */
  const collectPayload = (confirmedLevel: Level): TriageFormPayload => {
    const v = form.getFieldsValue();
    const gcsEnabled = v.gcsEnabled;
    const strokeEnabled = v.strokeEnabled;
    return {
      chiefComplaint: v.chiefComplaint || null,
      vitals: {
        temperature: v.temperature ?? null,
        pulse: v.pulse ?? null,
        respiration: v.respiration ?? null,
        systolic: v.systolic ?? null,
        diastolic: v.diastolic ?? null,
        spo2: v.spo2 ?? null,
        consciousness: v.consciousness ?? null,
        painScore: v.painScore ?? null,
        supplementalO2: v.supplementalO2 ?? false,
      },
      gcs: gcsEnabled
        ? { eye: v.eye ?? 1, verbal: v.verbal ?? 1, motor: v.motor ?? 1 }
        : null,
      stroke: strokeEnabled
        ? {
            fastFace: v.fastFace ?? false,
            fastArm: v.fastArm ?? false,
            fastSpeech: v.fastSpeech ?? false,
            lamsFace: v.lamsFace ?? 0,
            lamsArm: v.lamsArm ?? 0,
            lamsGrip: v.lamsGrip ?? 0,
          }
        : null,
      cardiacArrest: v.cardiacArrest ?? false,
      catastrophe: v.catastrophe ?? false,
      level: confirmedLevel,
      basis: v.basis || undefined,
      aiSuggestedLevel: ai?.suggestedLevel ?? null,
      aiAdvice: ai ? ai.advice : null,
    };
  };

  const handleAi = async () => {
    try {
      // AI 建议不需要确认级别，占位传 4（后端 AI 不依赖该字段）
      const draft = collectPayload(4);
      const { level: _omit, ...rest } = draft;
      const advice = await fetchAiAdvice(item.visitId, rest);
      setAi(advice);
      setLevel(advice.suggestedLevel);
      message.success(
        advice.source === 'deepseek'
          ? 'DeepSeek AI 建议已生成'
          : 'AI 不可用，已回落规则引擎建议',
      );
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'AI 建议获取失败');
    }
  };

  const handleSubmit = async () => {
    if (!level) {
      message.warning('请先确认分诊级别');
      return;
    }
    const payload = collectPayload(level);
    await submitTriage(item.visitId, payload);
    message.success(`分诊完成：${TRIAGE_LEVEL_META[level].label}`);
    navigate('/emergency');
  };

  return (
    <div className="space-y-4">
      {/* 患者信息条 */}
      <Card className="shadow-card" styles={{ body: { padding: 16 } }}>
        <Row gutter={[12, 12]} align="middle">
          <Col>
            <b className="text-jl-primary">{item.triageNo}</b>
          </Col>
          <Col>
            <span className="font-semibold text-ink-primary">{item.patientName}</span>
            <span className="ml-2 text-sm text-ink-secondary">
              {item.gender === 'male' ? '男' : item.gender === 'female' ? '女' : item.gender} ·{' '}
              {item.age}
            </span>
          </Col>
          <Col flex="auto">
            <Space wrap>
              <Tag>{item.chiefComplaint ?? '主诉待补'}</Tag>
              <Tag color="default">到达 {item.arriveTime.slice(11, 16)}</Tag>
            </Space>
          </Col>
          <Col>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/emergency')}>
              返回分诊台
            </Button>
          </Col>
        </Row>
      </Card>

      <Form form={form} initialValues={initial} layout="vertical">
        {/* 生命体征 */}
        <Card title="生命体征" className="shadow-card" size="small">
          <Row gutter={12}>
            <Col xs={12} sm={8} md={6}>
              <Form.Item name="temperature" label="体温 ℃">
                <InputNumber className="w-full" min={30} max={45} step={0.1} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Form.Item name="pulse" label="脉搏 次/分">
                <InputNumber className="w-full" min={0} max={250} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Form.Item name="respiration" label="呼吸 次/分">
                <InputNumber className="w-full" min={0} max={60} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Form.Item name="systolic" label="收缩压 mmHg">
                <InputNumber className="w-full" min={0} max={300} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Form.Item name="diastolic" label="舒张压 mmHg">
                <InputNumber className="w-full" min={0} max={200} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Form.Item name="spo2" label="SpO₂ %">
                <InputNumber className="w-full" min={0} max={100} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Form.Item name="painScore" label="疼痛 NRS">
                <InputNumber className="w-full" min={0} max={10} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Form.Item name="consciousness" label="意识">
                <Select options={CONSCIOUSNESS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Form.Item name="supplementalO2" valuePropName="checked" label=" ">
                <Checkbox>吸氧中</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Space wrap>
            <Form.Item name="cardiacArrest" valuePropName="checked" noStyle>
              <Checkbox>心搏骤停 / 需即刻复苏</Checkbox>
            </Form.Item>
            <Form.Item name="catastrophe" valuePropName="checked" noStyle>
              <Checkbox>灾难事故批量伤员</Checkbox>
            </Form.Item>
          </Space>
        </Card>

        {/* GCS / 卒中量表（按需展开） */}
        <Collapse
          className="mt-3 bg-white"
          items={[
            {
              key: 'gcs',
              label: 'GCS 格拉斯哥昏迷评分（意识障碍/头部外伤时填写）',
              children: (
                <>
                  <Form.Item name="gcsEnabled" valuePropName="checked" noStyle>
                    <Checkbox className="mb-3">启用 GCS 评定</Checkbox>
                  </Form.Item>
                  <Row gutter={12}>
                    {(['eye', 'verbal', 'motor'] as const).map((k) => (
                      <Col xs={24} sm={8} key={k}>
                        <Form.Item name={k} label={GCS_META[k].label}>
                          <Select
                            options={GCS_META[k].options.map((o) => ({
                              value: o.value,
                              label: `${o.value} - ${o.label}`,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                    ))}
                  </Row>
                </>
              ),
            },
            {
              key: 'stroke',
              label: 'FAST / LAMS 卒中量表（疑似卒中时填写）',
              children: (
                <>
                  <Form.Item name="strokeEnabled" valuePropName="checked" noStyle>
                    <Checkbox className="mb-3">启用卒中评定</Checkbox>
                  </Form.Item>
                  <Row gutter={[12, 8]}>
                    {(['face', 'arm', 'speech'] as const).map((k) => (
                      <Col xs={24} sm={8} key={k}>
                        <Form.Item name={`fast${k[0].toUpperCase()}${k.slice(1)}`} valuePropName="checked">
                          <Checkbox>
                            FAST {FAST_META[k].label}
                            <span className="ml-1 text-xs text-ink-secondary">
                              {FAST_META[k].desc}
                            </span>
                          </Checkbox>
                        </Form.Item>
                      </Col>
                    ))}
                    {(['face', 'arm', 'grip'] as const).map((k) => (
                      <Col xs={24} sm={8} key={k}>
                        <Form.Item name={`lams${k[0].toUpperCase()}${k.slice(1)}`} label={`LAMS ${LAMS_META[k].label}`}>
                          <Select
                            options={LAMS_META[k].options.map((o) => ({
                              value: o.value,
                              label: `${o.value} - ${o.label}`,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                    ))}
                  </Row>
                </>
              ),
            },
          ]}
        />

        {/* 主诉 / 判定依据 */}
        <Card className="mt-3 shadow-card" size="small">
          <Form.Item name="chiefComplaint" label="主诉">
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="basis" label="判定依据（症状/客观指标，可留空由系统补充）">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Card>
      </Form>

      {/* AI 建议 */}
      <Card className="shadow-card" size="small">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">AI 辅助分诊</span>
          <Button icon={<RobotOutlined />} onClick={handleAi} loading={acting}>
            获取 AI 分级建议
          </Button>
        </div>
        {ai ? (
          <Alert
            type={ai.source === 'deepseek' ? 'info' : 'warning'}
            message={
              <Space wrap>
                <Tag color={TRIAGE_LEVEL_META[ai.suggestedLevel].color}>
                  AI 建议 {TRIAGE_LEVEL_META[ai.suggestedLevel].label}
                </Tag>
                <Tag>{ai.source === 'deepseek' ? 'DeepSeek' : '规则引擎回落'}</Tag>
              </Space>
            }
            description={
              <div className="space-y-1 text-sm">
                <div>
                  <b>即刻处置：</b>
                  {ai.advice.immediate}
                </div>
                <div>
                  <b>检查方向：</b>
                  {ai.advice.workup}
                </div>
                <div>
                  <b>鉴别诊断：</b>
                  {ai.advice.differential}
                </div>
                <div>
                  <b>风险提示：</b>
                  {ai.advice.risk}
                </div>
              </div>
            }
          />
        ) : (
          <div className="text-xs text-ink-secondary">
            AI 仅提供建议，最终分级由分诊护士确认并负责。
          </div>
        )}
      </Card>

      {/* 护士确认级别 */}
      <Card title="护士确认分诊级别" className="shadow-card" size="small">
        <Row gutter={[12, 12]}>
          {([1, 2, 3, 4] as Level[]).map((lv) => {
            const meta = TRIAGE_LEVEL_META[lv];
            const selected = level === lv;
            return (
              <Col xs={24} sm={12} md={6} key={lv}>
                <div
                  role="radio"
                  aria-checked={selected}
                  tabIndex={0}
                  onClick={() => setLevel(lv)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setLevel(lv);
                  }}
                  className={clsx(
                    'h-full cursor-pointer rounded-lg border-2 p-3 transition-all',
                    selected ? 'shadow-card' : 'border-ink-border',
                  )}
                  style={{ borderColor: selected ? meta.color : undefined }}
                >
                  <div className="flex items-center justify-between">
                    <b style={{ color: meta.color }}>{meta.label}</b>
                    {selected && <CheckCircleOutlined style={{ color: meta.color }} />}
                  </div>
                  <div className="mt-1 text-xs text-ink-secondary">{meta.wait}</div>
                </div>
              </Col>
            );
          })}
        </Row>

        <Divider className="my-4" />
        <Space>
          <Button
            type="primary"
            size="large"
            icon={<SafetyCertificateOutlined />}
            loading={acting}
            onClick={handleSubmit}
          >
            确认分诊并提交
          </Button>
          <span className="text-xs text-ink-secondary">提交后不可越级修改，如需更正须重评留痕</span>
        </Space>
      </Card>
    </div>
  );
}
