/**
 * 健澜科技 jlmedaios - 医生 Personal Agent 工作台 V8 页（M290-A）
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
  source: string;
  type: string;
  title: string;
  priority: "high" | "medium" | "low";
  dueAt: number;
}

interface Digest {
  pendingCount: number;
  alertCount: number;
  avgScore: number;
  highPriorityCount: number;
}

export default function AgentDoctorPage() {
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [digest, setDigest] = useState<Digest | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [t, d] = await Promise.all([
          get<TodoRow[]>("/api/v1/agent/doctor/todos"),
          get<Digest>("/api/v1/agent/doctor/digest"),
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
        <Title level={3} style={{ color: VI.deep }}>医生 Personal Agent 工作台</Title>
        <Paragraph type="secondary">今日待办·红黄绿优先级</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <>
            <Row gutter={16}>
              <Col span={6}><Card><Statistic title="待办总数" value={digest?.pendingCount ?? 0} /></Card></Col>
              <Col span={6}><Card><Statistic title="警报数" value={digest?.alertCount ?? 0} /></Card></Col>
              <Col span={6}><Card><Statistic title="高优先级" value={digest?.highPriorityCount ?? 0} /></Card></Col>
              <Col span={6}><Card><Statistic title="患者均分" value={digest?.avgScore ?? 0} /></Card></Col>
            </Row>
            <Card title="今日待办（已按优先级排序）" style={{ marginTop: 16 }}>
              <List
                dataSource={todos}
                renderItem={(t) => (
                  <List.Item>
                    <List.Item.Meta title={`[${t.type}] ${t.title}`} description={`来源=${t.source}`} />
                    <Tag color={t.priority === "high" ? "red" : t.priority === "medium" ? "orange" : "blue"}>
                      {t.priority}
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
