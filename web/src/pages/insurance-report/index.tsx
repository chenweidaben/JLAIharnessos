/**
 * 健澜科技 jlmedaios - 医保智能监管与 DRG/DIP 上报 V5 页（M278-B）
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
  totalClaims: number;
  highRiskCount: number;
  avgDeviationPct: number;
  balancedCount: number;
}

export default function InsuranceReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/insurance-report");
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
        <Title level={3} style={{ color: VI.deep }}>医保智能监管与 DRG/DIP 上报 V5</Title>
        <Paragraph type="secondary">DRG分组·DIP点值·费用偏差·智能监管疑点·对账申诉</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="理赔总数" value={data.totalClaims} /></Card></Col>
            <Col span={6}><Card><Statistic title="高风险" value={data.highRiskCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="费用偏差" value={`${data.avgDeviationPct}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="对账平衡" value={data.balancedCount} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
