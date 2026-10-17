/**
 * 健澜科技 jlmedaios - 中药房 V13 页（M380-D，M380 收官）
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
  tcmHerbVarietyCount: number;
  tcmDecoctionCount: number;
  tcmPrescriptionCount: number;
}

export default function TCMPharmacyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/tcm-pharmacy");
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
        <Title level={3} style={{ color: VI.deep }}>中药房</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="中药饮片品种数" value={data.tcmHerbVarietyCount} suffix="种" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="中药代煎剂人次" value={data.tcmDecoctionCount} suffix="人次" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="中药处方数" value={data.tcmPrescriptionCount} suffix="张" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
