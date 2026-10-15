/**
 * 健澜科技 jlmedaios - 住院医生智能助手 · 智能提醒卡片（M120-B）
 *   （依据宪法第七章：尊重患者人格尊严，医疗信息依法保密）
 *
 * 数据来源：GET /api/v1/assistant/inpatient?patientId=xxx
 * 三态：loading（Spin）/ error（Alert + 重试）/ empty（Empty 空态）。
 * VI：深海蓝主色 #0B3D6B，风险等级色按 antd Token 映射。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Empty, List, Spin, Tag, Typography } from 'antd';
import {
  AlertOutlined,
  BulbOutlined,
  LineChartOutlined,
  ReloadOutlined,
  RobotOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { get } from '@/api/client';

const { Text, Paragraph } = Typography;

/* ------------------------------- 类型 ------------------------------- */

type TrendDirection = 'improving' | 'stable' | 'worsening';
type RiskLevel = 'none' | 'low' | 'medium' | 'high';

interface TrendOut {
  direction: TrendDirection;
  summary: string;
  keySigns: Array<{ label: string; value: string }>;
}

interface SimilarCaseOut {
  patientId: string;
  diagnosis: string;
  losDays: number;
  outcome: 'improved' | 'unchanged' | 'deteriorated';
  matchScore: number;
  takeaway: string;
}

interface RiskItem {
  code: string;
  level: Exclude<RiskLevel, 'none'>;
  message: string;
}

interface RiskAlertOut {
  level: RiskLevel;
  items: RiskItem[];
  summary: string;
}

interface Suggestion {
  type: 'order' | 'review' | 'monitor' | 'consult';
  priority: 'low' | 'medium' | 'high';
  text: string;
  evidence: string;
}

interface AssistantResponse {
  patientId: string;
  trend: TrendOut;
  similarCases: SimilarCaseOut[];
  riskAlert: RiskAlertOut;
  suggestions: Suggestion[];
}

/* --------------------------- VI：深海蓝色板 --------------------------- */

const DEEP_SEA = '#0B3D6B';

const TREND_META: Record<TrendDirection, { label: string; color: string }> = {
  improving: { label: '好转', color: '#389E0D' },
  stable: { label: '平稳', color: '#1677FF' },
  worsening: { label: '恶化倾向', color: '#CF1322' },
};

const RISK_TAG: Record<RiskLevel, string> = {
  none: '默认',
  low: 'green',
  medium: 'orange',
  high: 'red',
};

const PRIORITY_TAG: Record<Suggestion['priority'], string> = {
  high: 'red',
  medium: 'orange',
  low: 'default',
};

/* ------------------------------- 组件 ------------------------------- */

export interface InpatientAssistantProps {
  /** 在院患者院内脱敏 ID */
  patientId: string;
  /** 所在病区 ID（透传给 BFF 审计留痕） */
  wardId?: string;
}

export default function InpatientAssistant({ patientId, wardId }: InpatientAssistantProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AssistantResponse | null>(null);

  const fetchAssistant = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await get<AssistantResponse>('/assistant/inpatient', { patientId, wardId });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '智能助手暂时不可用');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [patientId, wardId]);

  useEffect(() => {
    void fetchAssistant();
  }, [fetchAssistant]);

  /* ------------------------------ 三态 ------------------------------ */

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin tip="智能助手分析中…" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message="智能助手加载失败"
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
        <Empty description="请先选择在院患者，再查看智能提醒" />
      </Card>
    );
  }

  /* ------------------------------ 渲染 ------------------------------ */

  const trend = TREND_META[data.trend.direction];

  return (
    <Card
      style={{ borderTop: `3px solid ${DEEP_SEA}` }}
      title={
        <span style={{ color: DEEP_SEA }}>
          <RobotOutlined style={{ marginRight: 8 }} />
          住院医生智能助手
        </span>
      }
      extra={<Tag color="blue">patient {data.patientId}</Tag>}
    >
      {/* 病情走向 */}
      <div style={{ background: '#F4F8FC', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <LineChartOutlined style={{ color: DEEP_SEA }} />
          <Text strong style={{ color: DEEP_SEA }}>
            病情走向
          </Text>
          <Badge color={trend.color} text={<Text style={{ color: trend.color }}>{trend.label}</Text>} />
        </div>
        <Paragraph style={{ marginBottom: 8 }}>{data.trend.summary}</Paragraph>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {data.trend.keySigns.map((s) => (
            <Text key={s.label} type="secondary">
              {s.label}：<Text strong>{s.value}</Text>
            </Text>
          ))}
        </div>
      </div>

      {/* 风险提醒 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <AlertOutlined style={{ color: DEEP_SEA }} />
          <Text strong style={{ color: DEEP_SEA }}>
            风险提醒
          </Text>
          <Tag color={RISK_TAG[data.riskAlert.level]}>
            {data.riskAlert.level === 'none'
              ? '安全'
              : data.riskAlert.level === 'high'
                ? '高风险'
                : data.riskAlert.level === 'medium'
                  ? '需关注'
                  : '轻微异常'}
          </Tag>
        </div>
        {data.riskAlert.items.length === 0 ? (
          <Text type="secondary">{data.riskAlert.summary}</Text>
        ) : (
          <List
            size="small"
            dataSource={data.riskAlert.items}
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

      {/* 下一步建议 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <BulbOutlined style={{ color: DEEP_SEA }} />
          <Text strong style={{ color: DEEP_SEA }}>
            下一步建议
          </Text>
        </div>
        <List
          size="small"
          bordered
          dataSource={data.suggestions}
          renderItem={(s) => (
            <List.Item>
              <div>
                <div>
                  <Tag color={PRIORITY_TAG[s.priority]}>{s.priority === 'high' ? '紧急' : s.priority === 'medium' ? '今日' : '常规'}</Tag>
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
      </div>

      {/* 相似病例 */}
      {data.similarCases.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TeamOutlined style={{ color: DEEP_SEA }} />
            <Text strong style={{ color: DEEP_SEA }}>
              院内相似病例
            </Text>
          </div>
          <List
            size="small"
            dataSource={data.similarCases}
            renderItem={(c) => (
              <List.Item>
                <div>
                  <Text strong>{c.patientId}</Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {c.diagnosis} · 住院 {c.losDays} 天 · 相似度 {(c.matchScore * 100).toFixed(0)}%
                  </Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {c.takeaway}
                    </Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      )}

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          健澜科技 jlmedaios · 住院医生智能助手（M120-B） · 依据宪法第七章
        </Text>
      </div>
    </Card>
  );
}
