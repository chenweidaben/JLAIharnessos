/**
 * 健澜科技 jlmedaios - 院长季度复盘报告 V13 页（M310-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Review {
  quarter: string;
  kpiAchievementRate: number;
  highlights: string[];
  gaps: string[];
}

interface Resp {
  review: Review;
  nextQuarterActions: string[];
}

export default function QuarterlyReviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/quarterly-review?quarter=2026-Q3");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>院长季度复盘</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title={`KPI 达成率（${data.review.quarter}）`} value={`${data.review.kpiAchievementRate}%`} />
            </Card>
            <Card title="Top3 亮点" style={{ marginBottom: 16 }}>
              {data.review.highlights.map((h) => <Tag key={h} color="green">{h}</Tag>)}
            </Card>
            <Card title="Top3 短板" style={{ marginBottom: 16 }}>
              {data.review.gaps.map((g) => <Tag key={g} color="red">{g}</Tag>)}
            </Card>
            <Card title="下季度建议">
              <List
                dataSource={data.nextQuarterActions}
                renderItem={(a) => <List.Item>{a}</List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
