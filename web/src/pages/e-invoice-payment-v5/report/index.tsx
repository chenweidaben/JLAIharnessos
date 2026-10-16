/**
 * 健澜科技 jlmedaios - 电子票据与移动支付 V5 页（M271-A）
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
  metrics: { mobileRatio: number; selfServiceRate: number; avgPaymentTime: number; refundRate: number; errorRate: number };
  suggestions: string[];
}

export default function EInvoicePaymentV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/e-invoice-payment-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>电子票据与移动支付 V5</Title>
        <Paragraph type="secondary">电子票据·财政电子票据·开具·推送·查验·归档·红冲 / 移动支付·微信·支付宝·医保码·银联·聚合支付</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="移动支付占比" value={`${data.metrics.mobileRatio}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="自助缴费率" value={`${data.metrics.selfServiceRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="平均缴费时长" value={`${data.metrics.avgPaymentTime}s`} /></Card></Col>
            <Col span={6}><Card><Statistic title="差错率" value={`${data.metrics.errorRate}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
