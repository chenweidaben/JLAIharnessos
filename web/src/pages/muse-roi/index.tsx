/**
 * 健澜科技 jlmedaios - MUSE 成本与 ROI 分析 V5 页（M285-D）
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
  totalCost: number;
  totalSaved: number;
  overallROI: number;
  costPerSession: number;
}

export default function MuseRoiPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/muse-roi");
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
        <Title level={3} style={{ color: VI.deep }}>MUSE 成本与 ROI</Title>
        <Paragraph type="secondary">模型成本·节省价值·组合优化</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="总成本(元)" value={data.totalCost} /></Card></Col>
            <Col span={6}><Card><Statistic title="总节省(元)" value={data.totalSaved} /></Card></Col>
            <Col span={6}><Card><Statistic title="整体ROI" value={`${data.overallROI}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="单次成本" value={`¥${data.costPerSession}`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
