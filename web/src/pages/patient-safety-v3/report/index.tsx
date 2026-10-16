/**
 * 健澜科技 jlmedaios - 患者安全 V3 页（M241-A）
 *
 * I-IV级不良事件上报RCA根因/身份识别手术Time Out用药安全/高警示药品双人核对/VTE-MEWS脓毒症早期预警/Just Culture非惩罚。深海蓝 VI。
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
  adverse: { gradeI: number; gradeII: number; gradeIII: number; gradeIV: number };
  highAlert: number;
  timeOut: number;
  earlyWarning: { mews: number; vte: number; sepsis: number };
  justCulture: boolean;
  suggestions: string[];
}

export default function PatientSafetyV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/patient-safety-v3/report");
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
        <Title level={3} style={{ color: VI.deep }}>患者安全 V3</Title>
        <Paragraph type="secondary">I-IV 级不良事件上报·RCA 根因 / 身份识别·手术 Time Out·用药安全 / 高警示药品双人核对 / VTE·MEWS·脓毒症早期预警 / Just Culture 非惩罚</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="I级不良事件" value={data.adverse.gradeI} /></Card></Col>
              <Col span={6}><Card><Statistic title="高警示药品" value={data.highAlert} /></Card></Col>
              <Col span={6}><Card><Statistic title="Time Out" value={data.timeOut} /></Card></Col>
              <Col span={6}><Card><Statistic title="VTE 预警" value={data.earlyWarning.vte} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>安全明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "gradeII", name: "II级事件", value: data.adverse.gradeII },
                  { key: "gradeIII", name: "III级事件", value: data.adverse.gradeIII },
                  { key: "mews", name: "MEWS 预警", value: data.earlyWarning.mews },
                  { key: "sepsis", name: "脓毒症", value: data.earlyWarning.sepsis },
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
