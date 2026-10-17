/**
 * 健澜科技 jlmedaios - Agent 反馈与经验沉淀 V8 页（M291-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Summary {
  role: string;
  totalEvents: number;
  adoptRatePct: number;
  correctRatePct: number;
}

export default function AgentLearningPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Summary>("/api/v1/agent/learning-summary?role=doctor");
        if (!cancelled) setSummary(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>Agent 经验沉淀</Title>
        <Paragraph type="secondary">采纳率·修正率·本周规则沉淀</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && summary && (
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic title={`${summary.role} 总事件`} value={summary.totalEvents} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="采纳率" value={`${summary.adoptRatePct}%`} />
                <Tag color={summary.adoptRatePct >= 50 ? "green" : "orange"}>健康</Tag>
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="修正率" value={`${summary.correctRatePct}%`} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="沉淀规则" value={summary.totalEvents} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
