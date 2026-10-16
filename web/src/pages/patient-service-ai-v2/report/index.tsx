/**
 * 健澜科技 jlmedaios - 患者服务智能化 V2 页（M233-A）
 *
 * AI预问诊/智能导诊/个性化健康画像/患者AI助手24h问答/智能预约改约/医保实时结算/智能随访AI外呼。深海蓝 VI。
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
  preTriage: { sessions: number; accuracy: number };
  guidance: { triages: number; satisfaction: number };
  healthPortrait: { profiles: number };
  assistant: { qa24h: number };
  appointment: { smartBooked: number; changed: number };
  insurance: { settled: number };
  education: { articles: number };
  followup: { aiCalls: number };
  suggestions: string[];
}

export default function PatientServiceAIV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/patient-service-ai-v2/report");
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
        <Title level={3} style={{ color: VI.deep }}>患者服务智能化 V2</Title>
        <Paragraph type="secondary">AI 预问诊·智能导诊 / 个性化健康画像 / 24h AI 助手 / 智能预约改约 / 医保实时结算 / AI 随访外呼</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="预问诊会话" value={data.preTriage.sessions} /></Card></Col>
              <Col span={6}><Card><Statistic title="导诊满意度" value={`${data.guidance.satisfaction}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="24h AI 问答" value={data.assistant.qa24h} /></Card></Col>
              <Col span={6}><Card><Statistic title="AI 随访外呼" value={data.followup.aiCalls} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>AI 服务明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "portrait", name: "健康画像", value: `${data.healthPortrait.profiles} 人` },
                  { key: "book", name: "智能预约", value: data.appointment.smartBooked },
                  { key: "ins", name: "医保实时结算", value: data.insurance.settled },
                  { key: "edu", name: "健康科普文章", value: data.education.articles },
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
