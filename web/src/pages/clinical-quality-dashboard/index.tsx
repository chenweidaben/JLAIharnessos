/**
 * 健澜科技 jlmedaios - 医疗质量总仪表盘 V13 页（M322-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

type Light = "green" | "yellow" | "red";

interface IndicatorItem {
  name: string;
  value: number;
  light: Light;
}

interface Resp {
  dashboard: {
    indicators: IndicatorItem[];
  };
}

const LIGHT_COLOR: Record<Light, string> = {
  green: "green",
  yellow: "gold",
  red: "red",
};

const LIGHT_LABEL: Record<Light, string> = {
  green: "优",
  yellow: "中",
  red: "差",
};

export default function ClinicalQualityDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/clinical-quality-dashboard");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>医疗质量总仪表盘</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            {data.dashboard.indicators.map((item) => (
              <Col span={6} key={item.name}>
                <Card>
                  <Statistic title={item.name} value={item.value} />
                  <Tag color={LIGHT_COLOR[item.light]} style={{ marginTop: 8 }}>
                    {LIGHT_LABEL[item.light]}
                  </Tag>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Content>
    </Layout>
  );
}
