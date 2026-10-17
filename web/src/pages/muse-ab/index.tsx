/**
 * 健澜科技 jlmedaios - MUSE A/B 测试与效果评估 V5 页（M285-C）
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
  totalTests: number;
  bWins: number;
  tieRate: number;
}

export default function MuseAbPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/muse-ab");
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
        <Title level={3} style={{ color: VI.deep }}>MUSE A/B 测试</Title>
        <Paragraph type="secondary">实验设计·显著性·胜者决策</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}><Card><Statistic title="实验总数" value={data.totalTests} /></Card></Col>
            <Col span={8}><Card><Statistic title="B 胜数" value={data.bWins} /></Card></Col>
            <Col span={8}><Card><Statistic title="平局率" value={`${data.tieRate}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
