/**
 * 健澜科技 jlmedaios - 患者时间线看板（M508）
 * 路由：/clinical/timeline-board
 * 顶部 KPI：近 30 天事件 / 跨科室事件 / 关键事件 / 主要诊断数
 * 病程摘要 + 时间线事件
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Descriptions, List, Row, Spin, Statistic, Table, Tag, Timeline, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { TimelineEventRow } from '@/services/api/patientTimelineBoard';
import { usePatientTimelineBoardStore } from '@/store/patientTimelineBoardStore';

const { Text, Paragraph } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

const TYPE_META: Record<string, { color: string; label: string }> = {
  outpatient: { color: 'blue', label: '门诊' },
  inpatient: { color: 'green', label: '住院' },
  lab: { color: 'orange', label: '检验' },
  imaging: { color: 'purple', label: '检查' },
  medication: { color: 'cyan', label: '用药' },
  surgery: { color: 'red', label: '手术' },
};

const KEY_META: Record<string, { color: string; label: string }> = {
  critical: { color: 'red', label: '危急值' },
  allergy: { color: 'orange', label: '过敏警示' },
  surgery: { color: 'blue', label: '手术记录' },
};

const EVENT_COLUMNS: ColumnsType<TimelineEventRow> = [
  {
    title: '事件类型',
    dataIndex: 'type',
    render: (v: string) => {
      const m = TYPE_META[v] ?? { color: 'default', label: v };
      return <Tag color={m.color}>{m.label}</Tag>;
    },
  },
  { title: '时间戳', dataIndex: 'timestamp', render: (v: string) => <Text style={{ color: JL.navy }}>{v}</Text> },
  { title: '描述', dataIndex: 'description', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  {
    title: '关键事件',
    dataIndex: 'key',
    render: (v: string | null) =>
      v ? (
        (() => {
          const m = KEY_META[v] ?? { color: 'default', label: v };
          return <Tag color={m.color}>{m.label}</Tag>;
        })()
      ) : (
        <Tag>普通</Tag>
      ),
  },
];

export default function PatientTimelineBoardM508Page() {
  usePageTitle('患者时间线看板');
  const { events, summary, stats, loading, error, demo, load } = usePatientTimelineBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && events.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载时间线看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="患者时间线看板（电子病历五级 P0 — 跨科室全病程）"
      description="病程摘要 + 近 30 天事件 一屏总览"
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷新
        </Button>
      }
    >
      {error && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={error} />
      )}
      {demo && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="当前展示为 DEMO 兜底数据（BFF /timeline/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="近 30 天事件"
              value={stats?.recent30dEvents ?? events.length}
              suffix="条"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="跨科室事件"
              value={stats?.crossDeptEvents ?? 0}
              suffix="条"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="关键事件"
              value={stats?.keyEvents ?? events.filter((e) => e.key).length}
              suffix="条"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="主要诊断"
              value={stats?.primaryDiagnoses ?? 1}
              suffix="个"
              valueStyle={{ color: JL.ok }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ color: JL.navy, fontWeight: 600 }}>病程摘要</span>}
        style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
      >
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="主要诊断" span={2}>
            <Text strong style={{ color: JL.navy }}>{summary?.primaryDiagnosis ?? '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="过敏史">
            {(summary?.allergyHistory ?? []).map((a) => (
              <Tag key={a} color="red" style={{ marginRight: 4 }}>
                {a}
              </Tag>
            )) || <Text>无</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="住院次数">
            <Text strong style={{ color: JL.navy }}>{summary?.inpatientCount ?? 0} 次</Text>
          </Descriptions.Item>
          <Descriptions.Item label="手术史" span={2}>
            <Paragraph style={{ marginBottom: 0 }}>{summary?.surgeryHistory ?? '—'}</Paragraph>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>时间线（近 30 天）</span>}
            style={{ borderTop: `3px solid ${JL.accent}`, marginBottom: 16 }}
          >
            <Timeline
              items={events.slice(0, 8).map((e) => ({
                color: e.key === 'critical' ? 'red' : e.key === 'allergy' ? 'orange' : e.key === 'surgery' ? 'blue' : 'gray',
                children: (
                  <>
                    <Text type="secondary" style={{ fontSize: 12 }}>{e.timestamp}</Text>
                    <div>
                      {(() => {
                        const m = TYPE_META[e.type] ?? { color: 'default', label: e.type };
                        return <Tag color={m.color} style={{ marginRight: 6 }}>{m.label}</Tag>;
                      })()}
                      <Text strong>{e.description}</Text>
                    </div>
                  </>
                ),
              }))}
            />
            {events.length === 0 && <List size="small" />}
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>事件明细</span>}
            style={{ borderTop: `3px solid ${JL.blue}` }}
          >
            <Table rowKey="id" columns={EVENT_COLUMNS} dataSource={events} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
