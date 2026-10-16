/**
 * 健澜科技 jlmedaios - 患者画像 V2 页（M208-C）
 *
 * 360画像/慢病标签/高风险/全病程/签约/互联网随访/红黄绿。深海蓝 VI。
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
  profile: { total: number; dimensions: number };
  chronicTags: { hypertension: number; diabetes: number; coronary: number };
  highRisk: { repeatedAdmission: number; highCost: number; polypharmacy: number };
  continuity: { enrolled: number; followedUp: number; readmission30d: number };
  contract: { signed: number };
  internetFollowup: { online: number };
  behavior: { smoking: number; drinking: number };
  tiering: { red: number; yellow: number; green: number };
  suggestions: string[];
}

export default function PatientProfileV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/patient-profile/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>患者画像与全病程管理 V2 深化</Title>
        <Paragraph type="secondary">360° 画像 / 慢病标签 / 高风险识别 / 家庭医生签约 / 红黄绿分组</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="画像总数" value={data.profile.total} /></Card></Col>
              <Col span={6}><Card><Statistic title="红组（高风险）" value={data.tiering.red} /></Card></Col>
              <Col span={6}><Card><Statistic title="签约人数" value={data.contract.signed} /></Card></Col>
              <Col span={6}><Card><Statistic title="30 天再入院" value={data.continuity.readmission30d} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>红黄绿分组</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'red', name: '红组（高风险）', value: data.tiering.red },
                  { key: 'yellow', name: '黄组（中风险）', value: data.tiering.yellow },
                  { key: 'green', name: '绿组（低风险）', value: data.tiering.green },
                ]}
                columns={[
                  { title: '分组', dataIndex: 'name', key: 'name' },
                  { title: '人数', dataIndex: 'value', key: 'value' },
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
