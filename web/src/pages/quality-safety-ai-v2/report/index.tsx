/**
 * 健澜科技 jlmedaios - 质量安全智能化 V2 页（M233-D）
 *
 * 跌倒压疮用药错误实时预警/AI根因分析因果推理/质量预测/MEWS/VTE/脓毒症早期预警/智能质控拦截。深海蓝 VI。
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
  alerts: { fall: number; pressure: number; medication: number };
  rootCause: { aiAnalysis: number };
  prediction: { qualityRate: number };
  mews: { earlyWarning: number; vte: number; sepsis: number };
  qc: { intercept: number };
  suggestions: string[];
}

export default function QualitySafetyAIV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/quality-safety-ai-v2/report");
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
        <Title level={3} style={{ color: VI.deep }}>质量安全智能化 V2</Title>
        <Paragraph type="secondary">跌倒·压疮·用药错误实时预警 / AI 根因分析 / 质量预测 / MEWS·VTE·脓毒症早期预警 / 智能质控拦截</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="跌倒预警" value={data.alerts.fall} /></Card></Col>
              <Col span={6}><Card><Statistic title="MEWS 预警" value={data.mews.earlyWarning} /></Card></Col>
              <Col span={6}><Card><Statistic title="质量预测率" value={`${data.prediction.qualityRate}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="质控拦截" value={data.qc.intercept} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>安全 AI 明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "pressure", name: "压疮预警", value: data.alerts.pressure },
                  { key: "med", name: "用药错误预警", value: data.alerts.medication },
                  { key: "vte", name: "VTE 预警", value: data.mews.vte },
                  { key: "sepsis", name: "脓毒症预警", value: data.mews.sepsis },
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
