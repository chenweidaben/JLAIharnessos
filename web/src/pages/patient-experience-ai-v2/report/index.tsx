/**
 * 健澜科技 jlmedaios - 患者体验智能化 V2 页（M235-A）
 *
 * AI患者旅程/个性化路径/断点分析/智能推荐/NPS预测/情绪识别/无障碍/共同决策PRO。深海蓝 VI。
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
  journey: { ai: number; personalized: number; breakpoints: number };
  recommendation: { doctor: number; dept: number; exam: number; content: number };
  satisfaction: { nps: number; complaints: number; emotion: number };
  accessibility: { done: boolean };
  pro: { coDecision: number };
  suggestions: string[];
}

export default function PatientExperienceAIV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/patient-experience-ai-v2/report");
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
        <Title level={3} style={{ color: VI.deep }}>患者体验智能化 V2</Title>
        <Paragraph type="secondary">AI 患者旅程·个性化路径·断点分析 / 智能推荐 / NPS 预测·投诉流失预警·情绪识别 / 无障碍·共同决策 PRO</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="AI 患者旅程" value={data.journey.ai} /></Card></Col>
              <Col span={6}><Card><Statistic title="NPS" value={data.satisfaction.nps} /></Card></Col>
              <Col span={6}><Card><Statistic title="智能推荐" value={data.recommendation.content} /></Card></Col>
              <Col span={6}><Card><Statistic title="情绪识别" value={data.satisfaction.emotion} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>体验明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "break", name: "断点", value: data.journey.breakpoints },
                  { key: "complaint", name: "投诉", value: data.satisfaction.complaints },
                  { key: "pro", name: "共同决策", value: data.pro.coDecision },
                  { key: "acc", name: "无障碍", value: data.accessibility.done ? "已覆盖" : "未覆盖" },
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
