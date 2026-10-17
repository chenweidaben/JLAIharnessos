/**
 * 健澜科技 jlmedaios - 院长驾驶舱 V5 页（M287-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface KpiRow {
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: "up" | "down" | "flat";
  achievementPct: number;
}

interface Summary {
  totalKpis: number;
  onTargetCount: number;
  avgAchievementPct: number;
}

interface RankRow {
  name: string;
  score: number;
  rank: number;
}

interface Result {
  summary: Summary;
  kpis: KpiRow[];
  rank: RankRow[];
}

export default function ExecDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [summary, kpis, rank] = await Promise.all([
          get<Summary>("/api/v1/exec-dashboard"),
          get<KpiRow[]>("/api/v1/exec-dashboard/kpis"),
          get<RankRow[]>("/api/v1/exec-dashboard/rank"),
        ]);
        if (!cancelled) setData({ summary, kpis, rank });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>院长驾驶舱</Title>
        <Paragraph type="secondary">八宫格·达成率·科室排名</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="KPI总数" value={data.summary.totalKpis} /></Card></Col>
              <Col span={8}><Card><Statistic title="达标数" value={data.summary.onTargetCount} /></Card></Col>
              <Col span={8}><Card><Statistic title="平均达成率" value={`${data.summary.avgAchievementPct}%`} /></Card></Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              {data.kpis.map((k) => (
                <Col span={6} key={k.name}>
                  <Card title={k.name}>
                    <Statistic value={k.value} suffix={k.unit} />
                    <Tag color={k.achievementPct >= 100 ? "green" : "orange"}>
                      {k.achievementPct}%
                    </Tag>
                  </Card>
                </Col>
              ))}
            </Row>
            <Card title="科室排名" style={{ marginTop: 16 }}>
              <List
                dataSource={data.rank}
                renderItem={(r) => (
                  <List.Item>
                    <List.Item.Meta title={`#${r.rank} ${r.name}`} description={`绩效 ${r.score}`} />
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
