/**
 * 健澜科技 jlmedaios - 科研创新 V2 页（M219-C）
 *
 * 国自然/科技部/横向课题/SCI论文/专利/成果转化/重点实验室/GCP/IIT/伦理/经费/多中心。深海蓝 VI。
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
  projects: { nsfc: number; ministry: number; horizontal: number };
  output: { sci: number; patents: number; translation: number };
  platform: { lab: number; gcp: boolean; iit: number };
  clinical: { multicenter: number };
  ethics: { approved: number };
  funding: { total: number };
  cooperation: { partners: number };
  integrity: { audit: boolean };
  suggestions: string[];
}

export default function ResearchV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/research/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>科研创新 V2</Title>
        <Paragraph type="secondary">国自然·科技部·横向课题 / SCI·专利·成果转化 / 重点实验室·GCP·IIT / 伦理·经费·多中心</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="国自然课题" value={data.projects.nsfc} /></Card></Col>
              <Col span={6}><Card><Statistic title="SCI 论文" value={data.output.sci} /></Card></Col>
              <Col span={6}><Card><Statistic title="专利" value={data.output.patents} /></Card></Col>
              <Col span={6}><Card><Statistic title="科研经费" value={`${(data.funding.total / 10000).toFixed(0)} 万`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>科研平台与临床</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'lab', name: '重点实验室', value: data.platform.lab },
                  { key: 'gcp', name: 'GCP 资质', value: data.platform.gcp ? '已具备' : '未具备' },
                  { key: 'iit', name: 'IIT 研究', value: data.platform.iit },
                  { key: 'multi', name: '多中心合作', value: data.clinical.multicenter },
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
