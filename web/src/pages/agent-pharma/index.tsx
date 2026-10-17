/**
 * 健澜科技 jlmedaios - 药师 Personal Agent（Pharma MUSE）工作台 V8 页（M290-C）
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
  type: "interactionAlert" | "reviewQueue" | "lowStock";
  title: string;
  severity: "high" | "medium" | "low";
}

interface Digest {
  queueCount: number;
  stockCount: number;
  alertCount: number;
  highAlertCount: number;
}

export default function AgentPharmaPage() {
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [digest, setDigest] = useState<Digest | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [t, d] = await Promise.all([
          get<TodoRow[]>("/api/v1/agent/pharma/todos"),
          get<Digest>("/api/v1/agent/pharma/digest"),
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
        <Title level={3} style={{ color: VI.deep }}>药师 MUSE 工作台</Title>
        <Paragraph type="secondary">待点评·相互作用·低库存</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <>
            <Row gutter={16}>
              <Col span={6}><Card><Statistic title="待点评" value={digest?.queueCount ?? 0} /></Card></Col>
              <Col span={6}><Card><Statistic title="低库存" value={digest?.stockCount ?? 0} /></Card></Col>
              <Col span={6}><Card><Statistic title="相互作用警报" value={digest?.alertCount ?? 0} /></Card></Col>
              <Col span={6}><Card><Statistic title="高严重度" value={digest?.highAlertCount ?? 0} /></Card></Col>
            </Row>
            <Card title="今日待办（相互作用优先）" style={{ marginTop: 16 }}>
              <List
                dataSource={todos}
                renderItem={(t) => (
                  <List.Item>
                    <List.Item.Meta title={`[${t.type}] ${t.title}`} />
                    <Tag color={t.severity === "high" ? "red" : t.severity === "medium" ? "orange" : "blue"}>
                      {t.severity}
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
