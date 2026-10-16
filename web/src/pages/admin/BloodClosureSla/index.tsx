/**
 * 健澜科技 jlmedaios - M182-A 输血不良反应闭环 SLA 看板（仅 admin）
 *
 * 「v5.0启动」医疗安全红线：输血不良反应闭环必须 100%，不容有失。
 *  - 上报即启动 24h 倒计时；
 *  - 20h 未闭环自动提醒责任医生；
 *  - 24h 未闭环升级至输血科主任；
 *  - 闭环留痕五段：上报 -> 评估 -> 处置 -> 记录 -> 总结。
 *
 * 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8，告警 #C0392B）；
 * 三态 loading / error（可重试）/ empty；显式标注演示数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Card, Col, Layout, Progress, Row, Space, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ------------------------------ 与 BFF 类型对齐 ------------------------------ */

type ClosureAction =
  | 'ON_TRACK' | 'REMIND_DOCTOR' | 'ESCALATE_DIRECTOR' | 'CLOSED_MET' | 'CLOSED_BREACH';
type ClosureStage =
  | 'reported' | 'assessed' | 'treated' | 'recorded' | 'summarized' | 'closed';

interface SlaItem {
  transfusionId: string;
  patientId: string;
  reactionType: string;
  severity: string;
  responsibleDoctorId: string;
  stage: ClosureStage;
  reportedAt: string;
  remindAt: string;
  deadlineAt: string;
  elapsedMs: number;
  remainingMs: number;
  isClosed: boolean;
  closedOnTime: boolean | null;
  action: ClosureAction;
  missingStages: ClosureStage[];
  completeness: number;
  message: string;
}

interface SlaSummary {
  total: number;
  closedCount: number;
  compliantCount: number;
  breachCount: number;
  remindCount: number;
  escalateCount: number;
  closureRatePct: number;
  redLine: string;
}

interface ClosureSlaResp {
  items: SlaItem[];
  summary: SlaSummary;
  sla: { remindAfterH: number; escalateAfterH: number; slaWindowH: number };
  demo: boolean;
}

const ACTION_META: Record<ClosureAction, { label: string; color: string }> = {
  ON_TRACK: { label: '在途', color: 'blue' },
  REMIND_DOCTOR: { label: '提醒医生', color: 'gold' },
  ESCALATE_DIRECTOR: { label: '升级主任', color: 'volcano' },
  CLOSED_MET: { label: '按时闭环', color: 'green' },
  CLOSED_BREACH: { label: '超时闭环', color: 'red' },
};

const STAGE_LABEL: Record<ClosureStage, string> = {
  reported: '上报', assessed: '评估', treated: '处置',
  recorded: '记录', summarized: '总结', closed: '闭环',
};

function fmtHours(ms: number): string {
  const h = Math.abs(ms) / 3600000;
  return `${h.toFixed(1)}h`;
}

/* ------------------------------ 页面 ------------------------------ */

export default function BloodClosureSlaPage() {
  const [data, setData] = useState<ClosureSlaResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/blood/closure-sla');
      const json = await resp.json();
      if (!resp.ok || json.code !== 0) throw new Error(json.message ?? '加载失败');
      setData(json.data as ClosureSlaResp);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns: ColumnsType<SlaItem> = [
    { title: '输血单号', dataIndex: 'transfusionId', key: 'transfusionId', width: 160 },
    { title: '患者', dataIndex: 'patientId', key: 'patientId', width: 90 },
    {
      title: '反应', dataIndex: 'reactionType', key: 'reactionType', width: 90,
      render: (t: string, r) => (
        <Space size={4}>
          <Tag>{t}</Tag>
          <Tag color={r.severity === 'severe' ? 'red' : r.severity === 'moderate' ? 'orange' : 'default'}>
            {r.severity}
          </Tag>
        </Space>
      ),
    },
    {
      title: '闭环阶段', dataIndex: 'stage', key: 'stage', width: 110,
      render: (s: ClosureStage) => <Tag color="processing">{STAGE_LABEL[s]}</Tag>,
    },
    {
      title: '留痕完整度', dataIndex: 'completeness', key: 'completeness', width: 140,
      render: (v: number) => (
        <Progress percent={v} size="small" strokeColor={v >= 100 ? '#1E8E5A' : '#1E5AA8'} />
      ),
    },
    {
      title: '剩余/超时', dataIndex: 'remainingMs', key: 'remainingMs', width: 110,
      render: (v: number, r) => r.isClosed
        ? <Text type="secondary">—</Text>
        : <Text type={v < 0 ? 'danger' : undefined}>{v < 0 ? `超 ${fmtHours(v)}` : `剩 ${fmtHours(v)}`}</Text>,
    },
    {
      title: 'SLA 动作', dataIndex: 'action', key: 'action', width: 110,
      render: (a: ClosureAction) => <Tag color={ACTION_META[a].color}>{ACTION_META[a].label}</Tag>,
    },
    { title: '责任医生', dataIndex: 'responsibleDoctorId', key: 'responsibleDoctorId', width: 100 },
    { title: '说明', dataIndex: 'message', key: 'message', ellipsis: true },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#F4F7FB' }}>
      <Content style={{ padding: 24 }}>
        <Title level={2} style={{ color: '#0B2A4A' }}>输血不良反应闭环 SLA（医疗安全红线）</Title>
        <Paragraph type="secondary">
          上报即启动 24h 倒计时 · 20h 未闭环提醒责任医生 · 24h 未闭环升级输血科主任。
          闭环留痕：上报 → 评估 → 处置 → 记录 → 总结。演示数据 · 纯函数推演。
        </Paragraph>

        {error && (
          <Alert
            type="error" showIcon style={{ marginBottom: 16 }}
            message={error} action={<Button size="small" onClick={load}>重试</Button>}
          />
        )}

        <Spin spinning={loading}>
          {data && (
            <>
              {/* 红线总览 */}
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Card size="small" bordered={false} style={{ background: '#0B2A4A', color: '#fff' }}>
                    <Statistic title="闭环率(%)" value={data.summary.closureRatePct} precision={1}
                      valueStyle={{ color: data.summary.closureRatePct >= 100 ? '#7FD1AE' : '#E8B04A' }} />
                    <Text style={{ color: '#cfe1f5', fontSize: 12 }}>{data.summary.redLine}</Text>
                  </Card>
                </Col>
                <Col span={4}>
                  <Card size="small" style={{ borderTop: '3px solid #1E8E5A', height: '100%' }}>
                    <Statistic title="按时闭环" value={data.summary.compliantCount} />
                  </Card>
                </Col>
                <Col span={4}>
                  <Card size="small" style={{ borderTop: '3px solid #C0392B', height: '100%' }}>
                    <Statistic title="超时闭环" value={data.summary.breachCount}
                      valueStyle={{ color: '#C0392B' }} />
                  </Card>
                </Col>
                <Col span={4}>
                  <Card size="small" style={{ borderTop: '3px solid #E8A33D', height: '100%' }}>
                    <Statistic title="待提醒医生" value={data.summary.remindCount}
                      valueStyle={{ color: '#E8A33D' }} />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ borderTop: '3px solid #D4380D', height: '100%' }}>
                    <Statistic title="已升级主任" value={data.summary.escalateCount}
                      valueStyle={{ color: '#D4380D' }} />
                  </Card>
                </Col>
              </Row>

              <Card size="small" title={<Text strong style={{ color: '#0B2A4A' }}>闭环 SLA 跟踪明细</Text>}
                style={{ borderTop: '3px solid #1E5AA8' }}>
                <Table rowKey="transfusionId" columns={columns} dataSource={data.items}
                  size="small" pagination={false} />
              </Card>

              <Alert style={{ marginTop: 16 }} type="error" showIcon
                message="红线：输血不良反应须在 24h 内完成「上报→评估→处置→记录→总结」全闭环；20h 提醒责任医生，24h 升级输血科主任；闭环率必须 100%。" />
            </>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
