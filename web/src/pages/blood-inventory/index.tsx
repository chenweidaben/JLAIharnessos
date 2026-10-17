/**
 * 健澜科技 jlmedaios - 血库库存 V13 页（M328-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface BloodStockByType {
  A: number;
  B: number;
  O: number;
  AB: number;
}

interface Resp {
  stockByType: BloodStockByType;
  nearExpiry: number;
}

export default function BloodInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/blood-inventory");
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
        <Title level={3} style={{ color: VI.deep }}>血库库存</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic title="A 型" value={data.stockByType.A} suffix="单位" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="B 型" value={data.stockByType.B} suffix="单位" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="O 型" value={data.stockByType.O} suffix="单位" />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic title="AB 型" value={data.stockByType.AB} suffix="单位" />
                </Card>
              </Col>
            </Row>
            <Card>
              保质期预警（7 天内到期）：
              <Tag color="red" style={{ marginLeft: 8, fontSize: 14, padding: "4px 12px" }}>
                {data.nearExpiry} 单位
              </Tag>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
