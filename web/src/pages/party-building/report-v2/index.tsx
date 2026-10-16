/**
 * 健澜科技 jlmedaios - 党建 V2 页（M228-A）
 *
 * 党委/总支/支部/党小组/组织生活/发展党员·积分·党费/主题教育·意识形态/八项规定·廉洁行医·纪检巡视。深海蓝 VI。
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
  organization: { committee: number; branches: number; groups: number };
  members: { total: number; developed: number; dues: number };
  ideology: { education: number };
  integrity: { eightPoint: boolean; cleanPractice: number };
  discipline: { inspection: number };
  integration: { business: number };
  propaganda: { articles: number };
  unitedFront: { members: number };
  suggestions: string[];
}

export default function PartyBuildingV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/party-building/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>党建 V2</Title>
        <Paragraph type="secondary">党委·总支·支部·党小组 / 发展党员·党费 / 主题教育·意识形态 / 八项规定·廉洁行医·纪检巡视</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="党支部" value={data.organization.branches} /></Card></Col>
              <Col span={6}><Card><Statistic title="党员总数" value={data.members.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="发展党员" value={data.members.developed} /></Card></Col>
              <Col span={6}><Card><Statistic title="宣传文章" value={data.propaganda.articles} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>党建工作明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'group', name: '党小组', value: data.organization.groups },
                  { key: 'edu', name: '主题教育', value: data.ideology.education },
                  { key: 'clean', name: '廉洁行医活动', value: data.integrity.cleanPractice },
                  { key: 'discipline', name: '纪检巡视', value: data.discipline.inspection },
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
