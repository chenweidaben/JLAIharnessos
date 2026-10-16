/**
 * 健澜科技 jlmedaios - 移动医疗 V2 页（M214-C）
 *
 * 移动医护/移动办公/患者APP小程序/移动随访/护理/药学/MDM。深海蓝 VI。
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
  mobileCare: { doctorStation: number; nurseStation: number; pda: number };
  office: { mobile: number };
  patientApp: { app: number; miniProgram: number };
  followup: { mobile: number };
  nursing: { mobile: number };
  pharmacy: { mobile: number };
  mdm: { devices: number; remoteWipe: number };
  suggestions: string[];
}

export default function MobileHealthV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/mobile-health/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>移动医疗 V2</Title>
        <Paragraph type="secondary">移动医护 / PDA 条码 / 患者 APP·小程序 / 移动随访 / MDM 安全远程擦除</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="PDA 设备" value={data.mobileCare.pda} /></Card></Col>
              <Col span={6}><Card><Statistic title="患者 APP" value={data.patientApp.app} /></Card></Col>
              <Col span={6}><Card><Statistic title="小程序" value={data.patientApp.miniProgram} /></Card></Col>
              <Col span={6}><Card><Statistic title="MDM 设备" value={data.mdm.devices} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>移动应用</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'doc', name: '移动医生站', value: data.mobileCare.doctorStation },
                  { key: 'nur', name: '移动护士站', value: data.mobileCare.nurseStation },
                  { key: 'fup', name: '移动随访', value: data.followup.mobile },
                  { key: 'pha', name: '移动药学', value: data.pharmacy.mobile },
                ]}
                columns={[
                  { title: '应用', dataIndex: 'name', key: 'name' },
                  { title: '用户数', dataIndex: 'value', key: 'value' },
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
