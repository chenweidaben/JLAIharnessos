/**
 * 健澜科技 jlmedaios - 行政个人智能体使用统计 V13 页（M320-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ScenarioDist {
  document: number;
  meetingMinutes: number;
  dataReport: number;
}

interface Resp {
  adminId: string;
  callCount: number;
  scenarioDistribution: ScenarioDist;
  satisfaction: number;
}

export default function AdminMuseUsagePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/admin-muse-usage?adminId=a1");
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
        <Title level={3} style={{ color: VI.deep }}>行政个人智能体使用统计</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="调用概览" style={{ marginBottom: 16 }}>
              <Statistic title="调用次数" value={data.callCount} style={{ marginRight: 48 }} />
              <Statistic title="满意度" value={data.satisfaction} suffix="%" />
            </Card>
            <Card title="场景分布">
              <Statistic title="公文" value={data.scenarioDistribution.document} style={{ marginRight: 24 }} />
              <Statistic title="会议纪要" value={data.scenarioDistribution.meetingMinutes} style={{ marginRight: 24 }} />
              <Statistic title="数据报表" value={data.scenarioDistribution.dataReport} />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
