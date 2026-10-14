/**
 * 健澜科技 jlmedaios - 科室月度运营报表预览（DEMO）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Layout, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useMonthlyReportStore } from '@/store/monthlyReportStore';
import type { MonthlyReportRow, ReportStatus } from '@/services/api/monthlyReport';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const STATUS_COLOR: Record<ReportStatus, string> = { good: 'green', warn: 'orange', bad: 'red' };
const STATUS_TEXT: Record<ReportStatus, string> = { good: '达标', warn: '关注', bad: '预警' };

export default function MonthlyReportPage() {
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, error, load } = useMonthlyReportStore();

  useEffect(() => {
    void load(month);
  }, [load, month]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>科室月度运营报表</Title>
      </Header>
      <Content style={{ padding: 24 }}>
        <Space style={{ marginBottom: 16 }}>
          <Text>月份</Text>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </Space>

        {data?.demo && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="演示数据（DEMO）" description={`当前为 ${data.month} 演示口径，未接入真实运营库。`} />
        )}
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
            <Card><Statistic title="门诊量" value={data?.kpi.outpatientCount ?? '-'} suffix="人次" loading={loading} /></Card>
          </Col>
          <Col span={4}>
            <Card><Statistic title="住院量" value={data?.kpi.inpatientCount ?? '-'} suffix="人次" loading={loading} /></Card>
          </Col>
          <Col span={4}>
            <Card><Statistic title="门住院总量" value={data?.kpi.totalVolume ?? '-'} suffix="人次" loading={loading} /></Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="DRG 盈亏（元）"
                value={data?.kpi.drgProfitLoss ?? '-'}
                precision={0}
                loading={loading}
                valueStyle={{ color: (data?.kpi.drgProfitLoss ?? 0) >= 0 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="质控得分" value={data?.kpi.qcScore ?? '-'} suffix={`分${data ? ` / ${data.kpi.qcGrade}` : ''}`} loading={loading} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="抗菌药物使用率" value={data?.kpi.antibioticUse ?? '-'} suffix="%" loading={loading}
                valueStyle={{ color: (data?.kpi.antibioticCompliant ?? true) ? '#3f8600' : '#cf1322' }} />
            </Card>
          </Col>
        </Row>

        <Table<MonthlyReportRow>
          rowKey="indicator"
          loading={loading}
          dataSource={data?.summary ?? []}
          pagination={false}
          columns={[
            { title: '指标', dataIndex: 'indicator' },
            { title: '本月值', dataIndex: 'value' },
            { title: '目标值', dataIndex: 'target' },
            {
              title: '状态', dataIndex: 'status',
              render: (s: ReportStatus) => <Tag color={STATUS_COLOR[s]}>{STATUS_TEXT[s]}</Tag>,
            },
          ]}
        />
      </Content>
    </Layout>
  );
}
