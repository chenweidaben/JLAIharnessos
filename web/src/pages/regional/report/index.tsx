/**
 * 健澜科技 jlmedaios - 区域医联体页（M206-C）
 *
 * 医联体/双向转诊/远程医疗/资源下沉/基层赋能。深海蓝 VI。
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
  alliance: { members: number };
  referral: { up: number; down: number; acceptance: number; onTime: number };
  telemedicine: { consult: number; imaging: number; pathology: number };
  downlink: { expertClinic: number; training: number };
  primaryEnablement: { guid: number; systemDeployed: number };
  sharedData: { records: number };
  publicHealth: { collaborativeTasks: number };
  kpi: { score: number };
  suggestions: string[];
}

export default function RegionalHealthPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/regional/report');
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
        <Title level={3} style={{ color: VI.deep }}>区域医联体与分级诊疗</Title>
        <Paragraph type="secondary">医联体成员 / 双向转诊 / 远程医疗 / 专家下沉 / 基层赋能</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="医联体成员" value={data.alliance.members} /></Card></Col>
              <Col span={6}><Card><Statistic title="上转" value={data.referral.up} /></Card></Col>
              <Col span={6}><Card><Statistic title="下转" value={data.referral.down} /></Card></Col>
              <Col span={6}><Card><Statistic title="KPI 得分" value={data.kpi.score} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>远程医疗</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'mc', name: '远程会诊', value: data.telemedicine.consult },
                  { key: 'img', name: '远程影像', value: data.telemedicine.imaging },
                  { key: 'path', name: '远程病理', value: data.telemedicine.pathology },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
                  { title: '例数', dataIndex: 'value', key: 'value' },
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
