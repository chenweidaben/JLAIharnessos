/**
 * 健澜科技 jlmedaios - 医生显式反馈闭环 V13 页（M301-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Signal {
  acceptedCount: number;
  modifiedCount: number;
  rejectedCount: number;
  adoptionRate: number;
  modificationRate: number;
  rejectionRate: number;
  needsReview: boolean;
}

export default function FeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [signal, setSignal] = useState<Signal | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Signal>("/api/v1/feedback-signal?experienceId=e-1");
        if (!cancelled) setSignal(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>医生反馈闭环</Title>
        <Card style={{ marginBottom: 16 }}>
          <Button type="primary" style={{ marginRight: 8 }}>采纳建议</Button>
          <Button style={{ marginRight: 8 }}>修改后采纳</Button>
          <Button danger>驳回</Button>
        </Card>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && signal && (
          <>
            <Row gutter={16}>
              <Col span={8}>
                <Card><Statistic title="采纳率" value={signal.adoptionRate} suffix="%" /></Card>
              </Col>
              <Col span={8}>
                <Card><Statistic title="修改率" value={signal.modificationRate} suffix="%" /></Card>
              </Col>
              <Col span={8}>
                <Card><Statistic title="驳回率" value={signal.rejectionRate} suffix="%" /></Card>
              </Col>
            </Row>
            <Card style={{ marginTop: 16 }}>
              {signal.needsReview
                ? <Tag color="orange" style={{ fontSize: 16 }}>触发经验复审</Tag>
                : <Tag color="green" style={{ fontSize: 16 }}>信号稳定</Tag>}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
