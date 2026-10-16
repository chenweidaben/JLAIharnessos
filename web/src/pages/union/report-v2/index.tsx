/**
 * 健澜科技 jlmedaios - 工会群团 V2 页（M228-D）
 *
 * 工会委员会/分工会/职代会·院务公开·民主评议/节日慰问·困难补助·EAP/女职工两癌筛查·共青团·离退休。深海蓝 VI。
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
  organization: { committee: number; branches: number };
  democracy: { congress: number; openAffairs: boolean; evaluation: number };
  welfare: { holiday: number; subsidy: number; eap: number };
  activities: { held: number };
  female: { screening: number };
  youth: { members: number };
  retiree: { retirees: number };
  help: { families: number };
  suggestions: string[];
}

export default function UnionV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/union/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>工会群团 V2</Title>
        <Paragraph type="secondary">工会委员会·分工会 / 职代会·院务公开·民主评议 / 节日慰问·困难补助·EAP / 女职工筛查·共青团·离退休</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="分工会" value={data.organization.branches} /></Card></Col>
              <Col span={6}><Card><Statistic title="工会活动" value={data.activities.held} /></Card></Col>
              <Col span={6}><Card><Statistic title="女职工筛查" value={data.female.screening} /></Card></Col>
              <Col span={6}><Card><Statistic title="离退休职工" value={data.retiree.retirees} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>群团工作明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'democracy', name: '民主评议', value: data.democracy.evaluation },
                  { key: 'eap', name: 'EAP 服务', value: data.welfare.eap },
                  { key: 'youth', name: '共青团员', value: data.youth.members },
                  { key: 'help', name: '困难帮扶家庭', value: data.help.families },
                ]}
                columns={[
                  { title: '项目', dataIndex: 'name', key: 'name' },
                  { title: '数值', dataIndex: 'value', key: 'value' },
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
