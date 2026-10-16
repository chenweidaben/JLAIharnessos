/**
 * 健澜科技 jlmedaios - 人才队伍 V2 页（M219-B）
 *
 * 领军人才/学科带头人/中青年骨干/青苗计划/护理·医技·管理人才/招聘/任期考核。深海蓝 VI。
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
  leading: { academician: number; distinguished: number };
  leaders: { discipline: number };
  young: { backbone: number; greenseed: number };
  nursing: { talents: number };
  tech: { talents: number };
  management: { talents: number };
  recruitment: { positions: number };
  tenure: { reviewed: number };
  suggestions: string[];
}

export default function TalentV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/talent/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>人才队伍 V2</Title>
        <Paragraph type="secondary">领军人才 / 学科带头人 / 中青年骨干·青苗计划 / 护理·医技·管理人才 / 招聘·任期考核</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="领军人才" value={data.leading.distinguished} /></Card></Col>
              <Col span={6}><Card><Statistic title="学科带头人" value={data.leaders.discipline} /></Card></Col>
              <Col span={6}><Card><Statistic title="中青年骨干" value={data.young.backbone} /></Card></Col>
              <Col span={6}><Card><Statistic title="招聘岗位" value={data.recruitment.positions} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>人才结构</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'nurs', name: '护理人才', value: data.nursing.talents },
                  { key: 'tech', name: '医技人才', value: data.tech.talents },
                  { key: 'mgr', name: '管理人才', value: data.management.talents },
                  { key: 'tenure', name: '任期考核', value: data.tenure.reviewed },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'name', key: 'name' },
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
