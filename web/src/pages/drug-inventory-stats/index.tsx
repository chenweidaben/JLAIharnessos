/**
 * 健澜科技 jlmedaios - 药品库存管理 V13 页（M359-C，stats 避让已有 drugInventory）
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
  turnoverRate: number;
  nearExpiryRatio: number;
  monthlyShortageTimes: number;
}

export default function DrugInventoryStatsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/drug-inventory-stats");
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
        <Title level={3} style={{ color: VI.deep }}>药品库存管理</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="药品库存周转率" value={data.turnoverRate} precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="近效期药品占比" value={data.nearExpiryRatio} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="月度缺药次数" value={data.monthlyShortageTimes} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
