/**
 * 健澜科技 jlmedaios - 大模型微调与人在环反馈 V5 页（M280-D）
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
  totalFeedback: number;
  pendingFeedback: number;
  trainSamples: number;
  avgImprovement: number;
}

export default function FinetuneLoopPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/finetune-loop/report");
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
        <Title level={3} style={{ color: VI.deep }}>大模型微调与人在环反馈 V5</Title>
        <Paragraph type="secondary">训练数据准备·效果对比·反馈队列·人工标注</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="反馈总数" value={data.totalFeedback} /></Card></Col>
            <Col span={6}><Card><Statistic title="待处理" value={data.pendingFeedback} /></Card></Col>
            <Col span={6}><Card><Statistic title="训练样本" value={data.trainSamples} /></Card></Col>
            <Col span={6}><Card><Statistic title="平均提升" value={`${data.avgImprovement}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
