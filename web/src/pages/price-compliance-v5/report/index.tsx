/**
 * 健澜科技 jlmedaios - 价格管理与收费合规 V5 页（M271-C）
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
  timeRange: string;
  metrics: { complianceRate: number; adjustmentTimeliness: number; priceComplaint: number; newProjectCount: number };
}

export default function PriceComplianceV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/price-compliance-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>价格管理与收费合规 V5</Title>
        <Paragraph type="secondary">价格目录·医疗服务价格·药品价格·耗材价格 / 收费合规·分解收费·重复收费·超标准</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="合规率" value={`${data.metrics.complianceRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="调价及时率" value={`${data.metrics.adjustmentTimeliness}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="价格投诉" value={`${data.metrics.priceComplaint}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="新项目数" value={data.metrics.newProjectCount} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
