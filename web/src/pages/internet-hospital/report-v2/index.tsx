/**
 * 健澜科技 jlmedaios - 互联网医院 V2 页（M214-A）
 *
 * 在线问诊/在线处方/在线支付/健康咨询/预约挂号/报告查询/随访/监管。深海蓝 VI。
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
  consult: { text: number; video: number; voice: number; followUp: number };
  prescription: { online: number; valid: number };
  payment: { online: number };
  consultation: { health: number };
  appointment: { online: number };
  report: { query: number };
  followup: { managed: number };
  compliance: { prescriptionFlow: boolean; dataReport: boolean };
  suggestions: string[];
}

export default function InternetHospitalV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>('/api/v1/internet-hospital/report-v2');
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
        <Title level={3} style={{ color: VI.deep }}>互联网医院 V2</Title>
        <Paragraph type="secondary">在线图文/视频/语音问诊 / 在线处方 / 在线支付 / 健康咨询 / 报告查询 / 平台监管</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="图文问诊" value={data.consult.text} /></Card></Col>
              <Col span={6}><Card><Statistic title="视频问诊" value={data.consult.video} /></Card></Col>
              <Col span={6}><Card><Statistic title="在线处方" value={data.prescription.online} /></Card></Col>
              <Col span={6}><Card><Statistic title="在线支付" value={data.payment.online} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>服务功能</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: 'appt', name: '预约挂号', value: data.appointment.online },
                  { key: 'rep', name: '报告查询', value: data.report.query },
                  { key: 'fup', name: '随访管理', value: data.followup.managed },
                  { key: 'cons', name: '健康咨询', value: data.consultation.health },
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
