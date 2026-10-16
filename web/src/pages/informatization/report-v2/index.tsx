/**
 * 健澜科技 jlmedaios - 信息化规划 V2 页（M227-A）
 *
 * 3-5年战略·投资预算ROI/业务·应用·数据·技术·集成架构/HIS·EMR·LIS·PACS/ESB·FHIR·EMPI·等保三级。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from 'antd';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface Result {
  timeRange: string;
  strategy: { horizon: number; roi: number };
  architecture: { business: number; application: number; data: number; integration: number };
  systems: { his: boolean; emr: boolean; lis: boolean; pacs: boolean };
  integration: { esb: boolean; fhir: boolean; empi: boolean };
  security: { mlps3: boolean };
  projects: { planned: number; inProgress: number };
  governance: { itDept: number };
  smart: { level: number };
  suggestions: string[];
}

export default function InformatizationPlanV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/informatization/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>信息化规划 V2</Title>
        <Paragraph type="secondary">3-5 年战略·投资 ROI / 业务·应用·数据·集成架构 / HIS·EMR·LIS·PACS / ESB·FHIR·EMPI·等保三级</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="战略周期" value={`${data.strategy.horizon}年`} /></Card></Col>
              <Col span={6}><Card><Statistic title="投资 ROI" value={`${data.strategy.roi}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="在建项目" value={data.projects.inProgress} /></Card></Col>
              <Col span={6}><Card><Statistic title="IT 团队" value={data.governance.itDept} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>架构与系统</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'app', name: '应用系统数', value: data.architecture.application },
                  { key: 'data', name: '数据域', value: data.architecture.data },
                  { key: 'esb', name: 'ESB 集成', value: data.integration.esb ? '已建' : '未建' },
                  { key: 'fhir', name: 'FHIR 互操作', value: data.integration.fhir ? '已建' : '未建' },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '状态', dataIndex: 'value', key: 'value' },
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
