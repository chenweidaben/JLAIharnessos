/**
 * 健澜科技 jlmedaios - 医保管理页（M192-B）
 *
 * 医保政策/目录/审核/结算/考核/违规 + DRG 配置。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  dept: string;
  timeRange: string;
  policies: { employee: number; resident: number; seriousIllness: number; assistance: number };
  catalog: { drugs: number; treatments: number; services: number };
  audit: { preAuditPassRate: number; duringAuditPassRate: number; postAuditPassRate: number };
  settlement: { monthly: number; yearly: number; crossRegion: number };
  kpi: { averageCost: number; drugRatio: number; materialRatio: number; selfPayRatio: number };
  violations: { count: number; rate: number };
  drgConfig: { enabled: boolean; groups: number };
  suggestions: string[];
}

export default function InsuranceManagementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/admin/insurance/report');
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>医保管理 · {data?.dept ?? ''}</Title>
        <Paragraph type="secondary">政策 / 目录 / 审核 / 结算 / 考核 / 违规 / DRG</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}><Card><Statistic title="职工医保" value={data.policies.employee} /></Card></Col>
              <Col span={4}><Card><Statistic title="居民医保" value={data.policies.resident} /></Card></Col>
              <Col span={4}>
                <Card title="事前审核通过率">
                  <Progress percent={Math.round(data.audit.preAuditPassRate * 100)} size="small" status="success" />
                </Card>
              </Col>
              <Col span={4}><Card><Statistic title="次均费用" value={data.kpi.averageCost} prefix="¥" /></Card></Col>
              <Col span={4}><Card><Statistic title="违规例数" value={data.violations.count} /></Card></Col>
              <Col span={4}>
                <Card title="DRG 分组">
                  {data.drgConfig.enabled ? <Tag color="green">已启用</Tag> : <Tag color="red">未启用</Tag>}
                  <Text> {data.drgConfig.groups} 组</Text>
                </Card>
              </Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>医保结算</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'monthly', name: '月度结算', amount: data.settlement.monthly },
                  { key: 'yearly', name: '年度结算', amount: data.settlement.yearly },
                  { key: 'cross', name: '异地结算', amount: data.settlement.crossRegion },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '金额(元)', dataIndex: 'amount', key: 'amount' },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
