/**
 * 健澜科技 jlmedaios - 互联网医院 V3 页（M234-A）
 *
 * 图文/视频/语音在线问诊/在线处方流转/药店配药送药/医保线上支付/慢病在线随访/互联网药房监管。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
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
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  consult: { text: number; video: number; voice: number };
  prescription: { online: number; delivered: number };
  insurance: { onlinePaid: number };
  chronic: { followup: number };
  pharmacy: { regulated: boolean };
  suggestions: string[];
}

export default function InternetHospitalV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/internet-hospital-v3/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>互联网医院 V3</Title>
        <Paragraph type="secondary">图文·视频·语音在线问诊 / 在线处方流转·药店配药送药 / 医保线上支付 / 慢病在线随访 / 互联网药房监管</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="图文问诊" value={data.consult.text} /></Card></Col>
              <Col span={6}><Card><Statistic title="视频问诊" value={data.consult.video} /></Card></Col>
              <Col span={6}><Card><Statistic title="在线处方" value={data.prescription.online} /></Card></Col>
              <Col span={6}><Card><Statistic title="医保线上支付" value={data.insurance.onlinePaid} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>互联网医院明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "voice", name: "语音问诊", value: data.consult.voice },
                  { key: "deliver", name: "配送处方", value: data.prescription.delivered },
                  { key: "chronic", name: "慢病随访", value: data.chronic.followup },
                  { key: "reg", name: "药房监管", value: data.pharmacy.regulated ? "已监管" : "未监管" },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
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
