/**
 * 健澜科技 jlmedaios - PHARMA_MUSE 主动式晨会简报 V11 页（M293-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PharmaItem {
  id: string;
  category: string;
  title: string;
  priority: number;
}

interface PharmaResult {
  pharmacistId: string;
  items: PharmaItem[];
  reviewCount: number;
  lowStockCount: number;
  interactionAlertCount: number;
  interceptTotal: number;
  weightDeltaCount: number;
  text: string;
}

export default function PharmaBriefPage() {
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState<PharmaResult | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<PharmaResult>("/api/v1/pharma-brief?pharmacistId=ph-001");
        if (!cancelled) setBrief(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>PHARMA_MUSE 晨会</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && brief && (
          <>
            <Card bordered={false} style={{ background: VI.deep, color: "#fff", marginBottom: 16 }}>
              <Paragraph style={{ color: "#fff", fontSize: 16 }}>{brief.text}</Paragraph>
            </Card>
            <Row gutter={16}>
              <Col span={5}><Card><Statistic title="相互作用" value={brief.interactionAlertCount} /></Card></Col>
              <Col span={5}><Card><Statistic title="待点评" value={brief.reviewCount} /></Card></Col>
              <Col span={5}><Card><Statistic title="低库存" value={brief.lowStockCount} /></Card></Col>
              <Col span={5}><Card><Statistic title="昨日拦截" value={brief.interceptTotal} /></Card></Col>
              <Col span={4}><Card><Statistic title="权重变化" value={brief.weightDeltaCount} /></Card></Col>
            </Row>
            <Card title="今日重点（按优先级）" style={{ marginTop: 16 }}>
              <List
                dataSource={brief.items}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta title={it.title} description={`分类=${it.category}`} />
                    <Tag color={it.category === "interactionAlert" ? "red" : "blue"}>P{it.priority}</Tag>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
