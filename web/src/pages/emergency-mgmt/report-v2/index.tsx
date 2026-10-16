/**
 * 健澜科技 jlmedaios - 应急管理 V2 页（M229-A）
 *
 * 总体/专项预案/现场处置/应急指挥部/队伍/专家库/批量伤员检伤分类/I-IV级响应/物资/演练/复盘。深海蓝 VI。
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
  plan: { comprehensive: number; special: number; onSite: number };
  organization: { command: boolean; teams: number; experts: number };
  massCasualty: { drill: number };
  response: { level: string; activated: number };
  supplies: { categories: number; adequacy: number };
  communication: { system: boolean };
  training: { sessions: number };
  afterAction: { reviews: number };
  suggestions: string[];
}

export default function EmergencyMgmtV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/emergency-mgmt/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>应急管理 V2</Title>
        <Paragraph type="secondary">总体·专项预案·现场处置 / 应急指挥部·队伍·专家库 / 批量伤员检伤分类 / I-IV级响应·物资·演练·复盘</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="专项预案" value={data.plan.special} /></Card></Col>
              <Col span={6}><Card><Statistic title="应急队伍" value={data.organization.teams} /></Card></Col>
              <Col span={6}><Card><Statistic title="物资完备度" value={`${data.supplies.adequacy}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="复盘次数" value={data.afterAction.reviews} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>应急体系明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'onsite', name: '现场处置方案', value: data.plan.onSite },
                  { key: 'experts', name: '应急专家库', value: data.organization.experts },
                  { key: 'drill', name: '批量伤员演练', value: data.massCasualty.drill },
                  { key: 'training', name: '应急培训', value: data.training.sessions },
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
