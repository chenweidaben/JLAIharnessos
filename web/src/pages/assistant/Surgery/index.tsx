/**
 * 健澜科技 jlmedaios - 手术麻醉智能助手 · 智能提示卡片（M121-B）
 *   （依据宪法第七章：尊重患者人格尊严，医疗信息依法保密；第五十三条：保护人民健康）
 *
 * 数据来源：GET /api/v1/assistant/surgery?surgeryId=xxx
 * 三态：loading（Spin）/ error（Alert + 重试）/ empty（Empty 空态）。
 * VI：深海蓝主色 #0B3D6B，风险等级色按 antd Token 映射。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Empty, List, Row, Spin, Tag, Typography } from 'antd';
import {
  AlertOutlined,
  BulbOutlined,
  FileDoneOutlined,
  ReloadOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { get } from '@/api/client';

const { Text, Paragraph } = Typography;

/* ------------------------------- 类型 ------------------------------- */

type AnesthesiaRiskLevel = 'low' | 'medium' | 'high';
type AsaLevel = 'I' | 'II' | 'III' | 'IV';

interface RiskItem {
  code: string;
  level: Exclude<AnesthesiaRiskLevel, 'low'>;
  message: string;
}

interface RiskAssessmentOut {
  level: AnesthesiaRiskLevel;
  asaLevel: AsaLevel;
  items: RiskItem[];
  summary: string;
}

interface AnesthesiaSuggestion {
  type: 'induction' | 'maintenance' | 'airway' | 'analgesia' | 'monitoring' | 'antibiotic' | 'positioning';
  priority: 'low' | 'medium' | 'high';
  text: string;
  evidence: string;
}

interface IntraOpAlert {
  code: string;
  level: Exclude<AnesthesiaRiskLevel, 'low'>;
  trigger: string;
  advice: string;
}

interface PostOpAdvice {
  phase: 'pacu' | 'ward' | 'discharge';
  topic: string;
  priority: 'low' | 'medium' | 'high';
  text: string;
}

interface AssistantResponse {
  surgeryId: string;
  patientId: string;
  riskAssessment: RiskAssessmentOut;
  anesthesiaSuggestions: AnesthesiaSuggestion[];
  intraOpAlerts: IntraOpAlert[];
  postOpAdvice: PostOpAdvice[];
}

/* --------------------------- VI：深海蓝色板 --------------------------- */

const DEEP_SEA = '#0B3D6B';

const RISK_TAG: Record<AnesthesiaRiskLevel, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

const RISK_LABEL: Record<AnesthesiaRiskLevel, string> = {
  low: '低风险',
  medium: '需关注',
  high: '高风险',
};

const PRIORITY_TAG: Record<'low' | 'medium' | 'high', string> = {
  high: 'red',
  medium: 'orange',
  low: 'default',
};

const PRIORITY_LABEL: Record<'low' | 'medium' | 'high', string> = {
  high: '紧急',
  medium: '今日',
  low: '常规',
};

const PHASE_META: Record<PostOpAdvice['phase'], { label: string; color: string }> = {
  pacu: { label: 'PACU', color: 'volcano' },
  ward: { label: '病房', color: 'blue' },
  discharge: { label: '出院', color: 'green' },
};

/* ------------------------------- 组件 ------------------------------- */

export interface SurgeryAssistantProps {
  /** 拟行手术 ID */
  surgeryId: string;
  /** 院内脱敏患者 ID（透传给 BFF 审计留痕） */
  patientId?: string;
}

export default function SurgeryAssistant({ surgeryId, patientId }: SurgeryAssistantProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AssistantResponse | null>(null);

  const fetchAssistant = useCallback(async () => {
    if (!surgeryId) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { surgeryId };
      if (patientId) params.patientId = patientId;
      const res = await get<AssistantResponse>('/assistant/surgery', params);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '麻醉智能助手暂时不可用');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [surgeryId, patientId]);

  useEffect(() => {
    void fetchAssistant();
  }, [fetchAssistant]);

  /* ------------------------------ 三态 ------------------------------ */

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin tip="麻醉智能助手分析中…" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message="麻醉智能助手加载失败"
        description={
          <div>
            <Paragraph style={{ marginBottom: 8 }}>{error}</Paragraph>
            <Button size="small" icon={<ReloadOutlined />} onClick={() => void fetchAssistant()}>
              重试
            </Button>
          </div>
        }
      />
    );
  }

  if (!data) {
    return (
      <Card>
        <Empty description="请先选择拟行手术，再查看麻醉智能提示" />
      </Card>
    );
  }

  /* ------------------------------ 渲染 ------------------------------ */

  return (
    <Card
      style={{ borderTop: `3px solid ${DEEP_SEA}` }}
      title={
        <span style={{ color: DEEP_SEA }}>
          <RobotOutlined style={{ marginRight: 8 }} />
          手术麻醉智能助手
        </span>
      }
      extra={
        <span>
          <Tag color="blue">surgery {data.surgeryId}</Tag>
          <Tag color="default">patient {data.patientId}</Tag>
        </span>
      }
    >
      {/* 风险评估 */}
      <div style={{ background: '#F4F8FC', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <SafetyCertificateOutlined style={{ color: DEEP_SEA }} />
          <Text strong style={{ color: DEEP_SEA }}>
            麻醉风险评估
          </Text>
          <Tag color={RISK_TAG[data.riskAssessment.level]}>
            {RISK_LABEL[data.riskAssessment.level]}
          </Tag>
          <Tag color="geekblue">ASA {data.riskAssessment.asaLevel}</Tag>
        </div>
        <Paragraph style={{ marginBottom: data.riskAssessment.items.length ? 8 : 0 }}>
          {data.riskAssessment.summary}
        </Paragraph>
        {data.riskAssessment.items.length > 0 && (
          <List
            size="small"
            dataSource={data.riskAssessment.items}
            renderItem={(item) => (
              <List.Item>
                <Tag color={item.level === 'high' ? 'red' : 'orange'} style={{ marginRight: 8 }}>
                  {item.level === 'high' ? '高' : '中'}
                </Tag>
                <Text>{item.message}</Text>
              </List.Item>
            )}
          />
        )}
      </div>

      <Row gutter={16}>
        {/* 麻醉建议 */}
        <Col xs={24} lg={12} style={{ marginBottom: 16 }}>
          <Card
            size="small"
            title={
              <span>
                <BulbOutlined style={{ color: DEEP_SEA, marginRight: 6 }} />
                <Text strong style={{ color: DEEP_SEA }}>麻醉方案建议</Text>
              </span>
            }
          >
            <List
              size="small"
              dataSource={data.anesthesiaSuggestions}
              renderItem={(s) => (
                <List.Item>
                  <div>
                    <div>
                      <Tag color={PRIORITY_TAG[s.priority]}>{PRIORITY_LABEL[s.priority]}</Tag>
                      <Tag>{s.type}</Tag>
                      <Text>{s.text}</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      依据：{s.evidence}
                    </Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 术中预警 */}
        <Col xs={24} lg={12} style={{ marginBottom: 16 }}>
          <Card
            size="small"
            title={
              <span>
                <ThunderboltOutlined style={{ color: DEEP_SEA, marginRight: 6 }} />
                <Text strong style={{ color: DEEP_SEA }}>术中重点预警</Text>
              </span>
            }
          >
            <List
              size="small"
              dataSource={data.intraOpAlerts}
              renderItem={(a) => (
                <List.Item>
                  <div>
                    <div>
                      <Badge
                        color={a.level === 'high' ? '#CF1322' : '#D46B08'}
                        text={<Text strong style={{ color: a.level === 'high' ? '#CF1322' : '#D46B08' }}>{a.code}</Text>}
                      />
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>触发：{a.trigger}</Text>
                    </div>
                    <div>
                      <Text>{a.advice}</Text>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* 术后医嘱 */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <FileDoneOutlined style={{ color: DEEP_SEA }} />
          <Text strong style={{ color: DEEP_SEA }}>术后医嘱建议</Text>
        </div>
        <List
          size="small"
          bordered
          dataSource={data.postOpAdvice}
          renderItem={(p) => (
            <List.Item>
              <Tag color={PHASE_META[p.phase].color}>{PHASE_META[p.phase].label}</Tag>
              <Tag color={PRIORITY_TAG[p.priority]}>{PRIORITY_LABEL[p.priority]}</Tag>
              <Text strong style={{ marginRight: 8 }}>{p.topic}</Text>
              <Text>{p.text}</Text>
            </List.Item>
          )}
        />
      </div>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          健澜科技 jlmedaios · 手术麻醉智能助手（M121-B） · 依据宪法第七章
        </Text>
      </div>
    </Card>
  );
}
