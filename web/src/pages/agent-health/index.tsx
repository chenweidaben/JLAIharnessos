/**
 * 健澜科技 jlmedaios - 智能体健康度评分 V12 页（M294-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface HealthScore {
  role: string;
  score: number;
  level: "healthy" | "watch" | "critical";
}

interface Dashboard {
  scores: HealthScore[];
  avgScore: number;
  lowestRole: string;
  criticalCount: number;
}

const levelColor: Record<string, string> = {
  healthy: "green",
  watch: "orange",
  critical: "red",
};

export default function AgentHealthPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Dashboard | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Dashboard>("/api/v1/agent-health");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>智能体健康度</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="平均分" value={data.avgScore} /></Card></Col>
              <Col span={8}><Card><Statistic title="最低分角色" value={data.lowestRole} /></Card></Col>
              <Col span={8}><Card><Statistic title="critical 数" value={data.criticalCount} /></Card></Col>
            </Row>
            <Card title="各角色健康分" style={{ marginTop: 16 }}>
              <List
                dataSource={data.scores}
                renderItem={(s) => (
                  <List.Item>
                    <List.Item.Meta title={s.role} description={`健康分=${s.score}`} />
                    <Tag color={levelColor[s.level]}>{s.level}</Tag>
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
