/**
 * 健澜科技 jlmedaios - 虚拟病例演练与团队复盘 V5 页（M276-C）
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
  totalCases: number;
  avgScore: number;
  passRate: number;
}

export default function DrillCasePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/drill-case");
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
        <Title level={3} style={{ color: VI.deep }}>虚拟病例演练与团队复盘</Title>
        <Paragraph type="secondary">模拟病例·难度分级·步骤评分·复盘改进</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}><Card><Statistic title="病例总数" value={data.totalCases} /></Card></Col>
            <Col span={8}><Card><Statistic title="平均得分" value={data.avgScore} /></Card></Col>
            <Col span={8}><Card><Statistic title="通过率" value={`${data.passRate}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
