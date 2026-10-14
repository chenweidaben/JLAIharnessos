/**
 * 健澜科技 jlmedaios - 文书时效监控页（M87-C）
 * 超时文书台账 + 统计数字卡片；逾期红色 Tag、按时绿色 Tag。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import {
  Alert, Button, Card, Col, Empty, Layout, Row, Statistic, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePermission } from '@/router/guards';
import { useEmrGapTimelinessStore } from '@/store/emrGapTimelinessStore';
import type { TimelinessItem } from '@/types/emrGap';

const { Header, Content } = Layout;
const { Title } = Typography;

const DOC_TYPE_LABEL: Record<string, string> = {
  admission_note: '入院记录',
  first_progress: '首次病程',
  daily_progress: '日常病程',
  discharge_summary: '出院小结',
  consent: '知情同意书',
  surgery_record: '手术记录',
};

function docTypeLabel(t: string): string {
  return DOC_TYPE_LABEL[t] ?? t;
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  return h > 0 ? `${h} 小时` : `${min} 分钟`;
}

export default function TimelinessPage() {
  const { rows, loading, scanning, error, load, scan } = useEmrGapTimelinessStore();
  const { hasPermission } = usePermission();

  useEffect(() => { void load(); }, [load]);

  const now = Date.now();
  const overdueCount = rows.filter((r) => new Date(r.dueAt).getTime() < now).length;
  const onTimeCount = rows.length - overdueCount;
  const today = new Date().toDateString();
  const dueTodayCount = rows.filter((r) => new Date(r.dueAt).toDateString() === today).length;

  const columns: ColumnsType<TimelinessItem> = [
    { title: '就诊号', dataIndex: 'visitId', key: 'visitId' },
    { title: '文书类型', dataIndex: 'docType', key: 'docType', render: (v: string) => docTypeLabel(v) },
    { title: '规定时限', dataIndex: 'requiredMinutes', key: 'requiredMinutes', render: (v: number) => formatMinutes(v) },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    { title: '应完成时间', dataIndex: 'dueAt', key: 'dueAt', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (_: unknown, r) => {
        const overdue = new Date(r.dueAt).getTime() < now;
        return overdue
          ? <Tag color="red">已逾期</Tag>
          : <Tag color="green">时限内</Tag>;
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>文书时效监控（M87-C）</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card><Statistic title="待处理台账" value={rows.length} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="已逾期" value={overdueCount} valueStyle={{ color: '#cf1322' }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="时限内" value={onTimeCount} valueStyle={{ color: '#3f8600' }} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="今日到期" value={dueTodayCount} valueStyle={{ color: '#d46b08' }} /></Card>
          </Col>
        </Row>

        <Card
          title="超时文书台账"
          extra={hasPermission('timeliness:alert') ? (
            <Button type="primary" loading={scanning} onClick={() => void scan()}>
              立即扫描逾期
            </Button>
          ) : undefined}
        >
          <Table
            rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows}
            pagination={false}
            locale={{ emptyText: <Empty description="暂无待处理文书，时效良好" /> }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
