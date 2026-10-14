/**
 * 健澜科技 jlmedaios - MEDMUSE Agent 健康度看板
 *
 * 今日 agent 调用 Table：agent / 调用数 / 平均响应(ms) / 失败率 / 熔断 Tag；
 * 顶部 overall 状态 Tag + 合计指标 + 手动刷新。
 * 深海蓝 VI：标题栏 #0A2540，主按钮 #4A90D9。
 *
 * 后端：GET /api/v1/medmuse/agent-health（仅登录鉴权，见 src/bff/routes/agentHealth.ts）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import {
  Alert, Button, Card, Col, Empty, Layout, Row, Statistic, Table, Tag, Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAgentHealthStore } from '@/store/agentHealthStore';
import type { AgentHealthRow, AgentStatus } from '@/services/api/medmuseAgentHealth';

const { Header, Content } = Layout;
const { Title } = Typography;

/** overall / 行状态 Tag 配色：healthy=绿 warning=橙 critical=红 */
const STATUS_TAG: Record<AgentStatus, { color: string; label: string }> = {
  healthy: { color: 'green', label: '正常' },
  warning: { color: 'orange', label: '关注' },
  critical: { color: 'critical', label: '熔断' },
};

/** 失败率 0~1 -> 百分比文案 */
function fmtRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export default function AgentHealthPage() {
  const { board, loading, error, load } = useAgentHealthStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: ColumnsType<AgentHealthRow> = [
    {
      title: 'Agent',
      dataIndex: 'agent',
      key: 'agent',
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{v}</span>,
    },
    {
      title: '调用数',
      dataIndex: 'calls',
      key: 'calls',
      width: 100,
      sorter: (a, b) => a.calls - b.calls,
    },
    {
      title: '平均响应',
      key: 'avgDurationMs',
      width: 130,
      sorter: (a, b) => a.avgDurationMs - b.avgDurationMs,
      render: (_, r) => (
        <span style={{ color: r.avgDurationMs >= 3000 ? '#cf1322' : undefined }}>
          {r.avgDurationMs.toFixed(1)} ms
        </span>
      ),
    },
    {
      title: '失败率',
      dataIndex: 'failureRate',
      key: 'failureRate',
      width: 120,
      sorter: (a, b) => a.failureRate - b.failureRate,
      render: (_, r) => (
        <span style={{ color: r.failureRate >= 0.5 ? '#cf1322' : r.failureRate >= 0.2 ? '#d46b08' : undefined }}>
          {fmtRate(r.failureRate)}
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>（{r.failures} 次失败）</span>
        </span>
      ),
    },
    {
      title: '熔断状态',
      key: 'circuit',
      width: 130,
      render: (_, r) =>
        r.circuitOpen ? (
          <Tag color="red">已熔断</Tag>
        ) : (
          <Tag color="green">正常</Tag>
        ),
    },
    {
      title: '健康状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v: AgentStatus) => {
        const t = STATUS_TAG[v] ?? { color: 'default', label: v };
        return <Tag color={t.color}>{t.label}</Tag>;
      },
    },
  ];

  const overall = board ? STATUS_TAG[board.overall] : null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#0A2540', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>MEDMUSE Agent 健康度看板</Title>
        <Button
          icon={<ReloadOutlined />}
          style={{ background: '#4A90D9', borderColor: '#4A90D9', color: '#fff' }}
          loading={loading}
          onClick={() => void load()}
        >
          刷新
        </Button>
      </Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Card style={{ marginBottom: 16 }}>
          <Row gutter={24}>
            <Col span={6}>
              <Statistic
                title="整体状态"
                valueRender={() => (overall ? <Tag color={overall.color}>{overall.label}</Tag> : <Tag>-</Tag>)}
              />
            </Col>
            <Col span={6}>
              <Statistic title="今日总调用" value={board?.totals.calls ?? 0} />
            </Col>
            <Col span={6}>
              <Statistic title="失败次数" value={board?.totals.failures ?? 0} valueStyle={{ color: (board?.totals.failures ?? 0) > 0 ? '#cf1322' : undefined }} />
            </Col>
            <Col span={6}>
              <Statistic title="平均响应" value={`${board?.totals.avgDurationMs ?? 0} ms`} />
            </Col>
          </Row>
        </Card>

        <Card>
          <Table
            rowKey="agent"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={board?.agents ?? []}
            pagination={false}
            locale={{ emptyText: <Empty description="今日暂无 Agent 调用记录" /> }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
