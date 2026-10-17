/**
 * 健澜科技 jlmedaios - 新知识自动入库与指南更新监测 V5 页（M276-B）
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
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function KnowledgeIntakePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/knowledge-intake");
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
        <Title level={3} style={{ color: VI.deep }}>新知识自动入库与指南更新监测</Title>
        <Paragraph type="secondary">指南/文献自动抽取要点·去重·差异检测·专家审核发布</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="总数" value={data.total} /></Card></Col>
            <Col span={6}><Card><Statistic title="待审核" value={data.pending} /></Card></Col>
            <Col span={6}><Card><Statistic title="已发布" value={data.approved} /></Card></Col>
            <Col span={6}><Card><Statistic title="已驳回" value={data.rejected} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
