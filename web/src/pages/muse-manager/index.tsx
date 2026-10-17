/**
 * 健澜科技 jlmedaios - 管理者 MUSE 工作台 V5 页（M283-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  totalKpis: number;
  anomalyCount: number;
  topAnomaly: { name: string; value: number } | null;
}

export default function MuseManagerPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/muse-manager");
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
        <Title level={3} style={{ color: VI.deep }}>管理者 MUSE 工作台</Title>
        <Paragraph type="secondary">KPI异常检测·决策建议·待办</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}><Card><Statistic title="KPI总数" value={data.totalKpis} /></Card></Col>
            <Col span={8}><Card><Statistic title="异常KPI" value={data.anomalyCount} /></Card></Col>
            <Col span={8}><Card><Statistic title="最紧急" value={data.topAnomaly?.name ?? "—"} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
