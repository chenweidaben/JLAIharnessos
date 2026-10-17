/**
 * 健澜科技 jlmedaios - 被服洗涤与织物管理 V5 页（M279-A）
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
  totalItems: number;
  totalLost: number;
  lossRate: number;
  lowStockCount: number;
}

export default function LinenManagementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/linen-management");
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
        <Title level={3} style={{ color: VI.deep }}>被服洗涤与织物管理 V5</Title>
        <Paragraph type="secondary">洗涤计划·损耗追踪·常备库存·收发闭环</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="织物品类" value={data.totalItems} /></Card></Col>
            <Col span={6}><Card><Statistic title="损耗总数" value={data.totalLost} /></Card></Col>
            <Col span={6}><Card><Statistic title="损耗率" value={`${data.lossRate}%`} /></Card></Col>
            <Col span={6}><Card><Statistic title="库存偏低" value={data.lowStockCount} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
