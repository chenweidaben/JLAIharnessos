/**
 * 健澜科技 jlmedaios - 耗材库存 V13 页（M328-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  lowStock: number;
  nearExpiry: number;
  monthlyUsage: number;
}

export default function ConsumableInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/consumable-inventory");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>耗材库存</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="低库存预警" value={data.lowStock} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="近效期耗材" value={data.nearExpiry} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="本月领用量" value={data.monthlyUsage} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
