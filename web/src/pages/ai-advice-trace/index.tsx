/**
 * 健澜科技 jlmedaios - AI 建议全链路审计 V5 页（M276-A）
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
  quality: { total: number; adoptionRate: number; avgConfidence: number; overrideRate: number };
}

export default function AIAdviceTracePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/ai-advice-trace");
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
        <Title level={3} style={{ color: VI.deep }}>AI 建议全链路审计</Title>
        <Paragraph type="secondary">输入快照·证据引用·置信度·采纳/override 全链路可解释</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="建议总数" value={data.quality.total} /></Card></Col>
            <Col span={6}><Card><Statistic title="采纳率" value={`${data.quality.adoptionRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="平均置信度" value={data.quality.avgConfidence} /></Card></Col>
            <Col span={6}><Card><Statistic title="override率" value={`${data.quality.overrideRate}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
