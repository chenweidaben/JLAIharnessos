/**
 * 健澜科技 jlmedaios - 管理者 Personal Agent（Manager MUSE）工作台 V8 页（M290-D）
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
  type: "majorComplaint" | "kpiRed" | "approval";
  title: string;
  severity: "high" | "medium" | "low";
}

interface Digest {
  redKpiCount: number;
  complaintCount: number;
  majorComplaintCount: number;
  pendingApprovalCount: number;
}

export default function AgentManagerPage() {
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [digest, setDigest] = useState<Digest | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [t, d] = await Promise.all([
          get<TodoRow[]>("/api/v1/agent/manager/todos"),
          get<Digest>("/api/v1/agent/manager/digest"),
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
        <Title level={3} style={{ color: VI.deep }}>管理者 MUSE 工作台</Title>
        <Paragraph type="secondary">KPI 红项·重大投诉·待审批</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <>
            <Row gutter={16}>
              <Col span={6}><Card><Statistic title="KPI 红项" value={digest?.redKpiCount ?? 0} /></Card></Col>
              <Col span={6}><Card><Statistic title="投诉总数" value={digest?.complaintCount ?? 0} /></Card></Col>
              <Col span={6}><Card><Statistic title="重大投诉" value={digest?.majorComplaintCount ?? 0} /></Card></Col>
              <Col span={6}><Card><Statistic title="待审批" value={digest?.pendingApprovalCount ?? 0} /></Card></Col>
            </Row>
            <Card title="今日待办（重大投诉优先）" style={{ marginTop: 16 }}>
              <List
                dataSource={todos}
                renderItem={(t) => (
                  <List.Item>
                    <List.Item.Meta title={`[${t.type}] ${t.title}`} />
                    <Tag color={t.severity === "high" ? "red" : t.severity === "medium" ? "orange" : "blue"}>
                      {t.type}
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
