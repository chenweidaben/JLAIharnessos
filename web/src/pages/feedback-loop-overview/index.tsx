/**
 * 健澜科技 jlmedaios - 反馈闭环总览 V13 页（M301-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Overview {
  totalFeedbacks: number;
  appliedPatches: number;
  pendingPatches: number;
  avgAdoptionRate: number;
  trendDirection: "improving" | "stable" | "worsening";
  maturity: number;
  gap: string;
}

const trendColor: Record<string, string> = {
  improving: "green",
  stable: "blue",
  worsening: "red",
};

export default function FeedbackLoopOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Overview>("/api/v1/feedback-loop-overview");
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
        <Title level={3} style={{ color: VI.deep }}>MUSE 反馈闭环总览</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={6}><Card><Statistic title="反馈总数" value={data.totalFeedbacks} /></Card></Col>
              <Col span={6}><Card><Statistic title="已应用补丁" value={data.appliedPatches} /></Card></Col>
              <Col span={6}><Card><Statistic title="平均采纳率" value={data.avgAdoptionRate} suffix="%" /></Card></Col>
              <Col span={6}><Card><Statistic title="成熟度分" value={data.maturity} /></Card></Col>
            </Row>
            <Card style={{ marginTop: 16 }}>
              <Tag color={trendColor[data.trendDirection]} style={{ fontSize: 16, marginRight: 8 }}>
                趋势 {data.trendDirection}
              </Tag>
              {data.gap
                ? <Tag color="red" style={{ fontSize: 16 }}>{data.gap}</Tag>
                : <Tag color="green" style={{ fontSize: 16 }}>闭环健康</Tag>}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
