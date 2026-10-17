/**
 * 健澜科技 jlmedaios - Prompt 工程与模板治理 V5 页（M280-B）
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
  totalTemplates: number;
  activeCount: number;
  draftCount: number;
  avgEvalScore: number;
}

export default function PromptGovernancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/prompt-governance");
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
        <Title level={3} style={{ color: VI.deep }}>Prompt 工程与模板治理 V5</Title>
        <Paragraph type="secondary">模板渲染·版本治理·A/B评测·质量看板</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="模板总数" value={data.totalTemplates} /></Card></Col>
            <Col span={6}><Card><Statistic title="上线中" value={data.activeCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="草稿" value={data.draftCount} /></Card></Col>
            <Col span={6}><Card><Statistic title="平均评测分" value={data.avgEvalScore} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
