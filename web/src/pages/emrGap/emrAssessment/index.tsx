/**
 * 健澜科技 jlmedaios - 电子病历评级自评页（M87-D）
 * 五级评审自评得分项列表 + 达标/未达标 Tag + 总分达标率进度条。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, InputNumber, Layout, Progress, Space, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePermission } from '@/router/guards';
import { useEmrGapEmrAssessmentStore } from '@/store/emrGapEmrAssessmentStore';
import type { EmrMetric } from '@/types/emrGap';

const { Header, Content } = Layout;
const { Title } = Typography;

const STATUS_META: Record<string, { color: string; label: string }> = {
  pass: { color: 'green', label: '达标' },
  fail: { color: 'red', label: '未达标' },
  pending: { color: 'default', label: '未测量' },
};

export default function EmrAssessmentPage() {
  const { metrics, loading, savingCode, error, load, measure } = useEmrGapEmrAssessmentStore();
  const { hasPermission } = usePermission();

  // 每行本地草稿值
  const [drafts, setDrafts] = useState<Record<string, number>>({});

  useEffect(() => { void load(); }, [load]);

  const canMeasure = hasPermission('emr_assessment:view');

  const passCount = metrics.filter((m) => m.status === 'pass').length;
  const total = metrics.length;
  const percent = total ? Math.round((passCount / total) * 100) : 0;

  const columns: ColumnsType<EmrMetric> = [
    { title: '类别', dataIndex: 'category', key: 'category', width: 140 },
    { title: '评审指标', dataIndex: 'metricName', key: 'metricName' },
    {
      title: '目标值', dataIndex: 'targetValue', key: 'targetValue', width: 120,
      render: (v: number, r) => `${v}${r.unit ?? ''}`,
    },
    {
      title: '实测值', key: 'currentValue', width: 220,
      render: (_: unknown, r) => (
        <Space wrap>
          <InputNumber
            value={drafts[r.metricCode] ?? r.currentValue}
            onChange={(v) => setDrafts((prev) => ({ ...prev, [r.metricCode]: Number(v ?? 0) }))}
            disabled={!canMeasure}
            style={{ width: 120 }}
          />
          <Button
            type="primary" size="small" loading={savingCode === r.metricCode}
            disabled={!canMeasure}
            onClick={() => void measure(r.metricCode, drafts[r.metricCode] ?? r.currentValue).catch(() => undefined)}
          >
            录入
          </Button>
        </Space>
      ),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => <Tag color={STATUS_META[v]?.color}>{STATUS_META[v]?.label}</Tag>,
    },
    {
      title: '测量时间', dataIndex: 'measuredAt', key: 'measuredAt', width: 180,
      render: (v: string | null) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>电子病历评级自评（M87-D）</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Card title="五级评审自评总览" style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>达标率：达标 {passCount} 项 / 共 {total} 项</div>
          <Progress
            percent={percent}
            strokeColor={percent >= 80 ? '#3f8600' : percent >= 60 ? '#1677ff' : '#cf1322'}
          />
        </Card>

        <Card title="自评得分项">
          <Table
            rowKey="id" size="small" loading={loading} columns={columns} dataSource={metrics}
            pagination={false}
          />
        </Card>
      </Content>
    </Layout>
  );
}
