/**
 * 健澜科技 jlmedaios - 护士 Personal Agent（Nurse MUSE）工作台 V8 页（M290-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TodoRow {
  id: string;
  type: "pressureUlcer" | "ivTask" | "bedRound";
  title: string;
  riskLevel: "high" | "medium" | "low";
}

interface Digest {
  bedCount: number;
  riskCount: number;
  highRiskCount: number;
  ivTaskCount: number;
}

export default function AgentNursePage() {
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [digest, setDigest] = useState<Digest | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [t, d] = await Promise.all([
          get<TodoRow[]>("/api/v1/agent/nurse/todos"),
          get<Digest>("/api/v1/agent/nurse/digest"),
        ]);
        if (!cancelled) {
          setTodos(t);
          setDigest(d);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>护士 MUSE 工作台</Title>
        <Paragraph type="secondary">床位巡视·输液·压疮风险</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <>
            <Row gutter={16}>
              <Col span={6}><Card><Statistic title="分管床位" value={digest?.bedCount ?? 0} /></Card></Col>
              <Col span={6}><Card><Statistic title="压疮风险" value={digest?.riskCount ?? 0} /></Card></Col>
              <Col span={6}><Card><Statistic title="高风险" value={digest?.highRiskCount ?? 0} /></Card></Col>
              <Col span={6}><Card><Statistic title="待输液" value={digest?.ivTaskCount ?? 0} /></Card></Col>
            </Row>
            <Card title="今日待办（压疮优先）" style={{ marginTop: 16 }}>
              <List
                dataSource={todos}
                renderItem={(t) => (
                  <List.Item>
                    <List.Item.Meta title={`[${t.type}] ${t.title}`} />
                    <Tag color={t.riskLevel === "high" ? "red" : t.riskLevel === "medium" ? "orange" : "blue"}>
                      {t.riskLevel}
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
