/**
 * 健澜科技 jlmedaios - 党建行政页（M212-A）
 *
 * 三会一课/主题党日/党员管理/廉政/宣传/统战/办公室/信访/法务/制度。深海蓝 VI。
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
  party: { threeMeetings: number; themeDay: number; members: number };
  integrity: { cases: number };
  publicity: { articles: number };
  unitedFront: { activities: number };
  office: { documents: number };
  petition: { cases: number };
  legal: { contracts: number };
  system: { documents: number };
  suggestions: string[];
}

export default function PartyAdminReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/party-admin/report');
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
        <Title level={3} style={{ color: VI.deep }}>党建与行政管理</Title>
        <Paragraph type="secondary">三会一课 / 主题党日 / 党风廉政 / 宣传统战 / 信访法务 / 制度管理</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="党员数" value={data.party.members} /></Card></Col>
              <Col span={6}><Card><Statistic title="三会一课" value={data.party.threeMeetings} /></Card></Col>
              <Col span={6}><Card><Statistic title="主题党日" value={data.party.themeDay} /></Card></Col>
              <Col span={6}><Card><Statistic title="廉政案件" value={data.integrity.cases} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>行政管理</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'off', name: '办公室发文', value: data.office.documents },
                  { key: 'pet', name: '信访案件', value: data.petition.cases },
                  { key: 'leg', name: '法务合同', value: data.legal.contracts },
                  { key: 'sys', name: '制度文件', value: data.system.documents },
                ]}
                columns={[
                  { title: '模块', dataIndex: 'name', key: 'name' },
                  { title: '数量', dataIndex: 'value', key: 'value' },
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
