/**
 * 健澜科技 jlmedaios - 医护工作智能化 V2 页（M235-B）
 *
 * AI病历自动生成/语音录入/出院小结/鉴别诊断/检查用药建议/工作流优化/任务优先级/医护协同/倦怠预警。深海蓝 VI。
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
  documentation: { autoGen: number; voiceInput: number; dischargeSummary: number };
  decision: { differential: number; examAdvice: number; doseRec: number };
  workflow: { optimized: number; priority: number; collaboration: number };
  burnout: { alert: number };
  suggestions: string[];
}

export default function ClinicianWorkAIV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/clinician-work-ai-v2/report");
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
        <Title level={3} style={{ color: VI.deep }}>医护工作智能化 V2</Title>
        <Paragraph type="secondary">AI 病历自动生成·语音录入·出院小结 / 鉴别诊断·检查用药建议 / 工作流优化·任务优先级·医护协同 / 倦怠预警</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="AI 病历生成" value={data.documentation.autoGen} /></Card></Col>
              <Col span={6}><Card><Statistic title="鉴别诊断" value={data.decision.differential} /></Card></Col>
              <Col span={6}><Card><Statistic title="工作流优化" value={data.workflow.optimized} /></Card></Col>
              <Col span={6}><Card><Statistic title="倦怠预警" value={data.burnout.alert} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>医护工作明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "voice", name: "语音录入", value: data.documentation.voiceInput },
                  { key: "discharge", name: "出院小结", value: data.documentation.dischargeSummary },
                  { key: "exam", name: "检查建议", value: data.decision.examAdvice },
                  { key: "collab", name: "医护协同", value: data.workflow.collaboration },
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
