/**
 * 健澜科技 jlmedaios - 公共卫生应急 V13 页（M324-D）
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
  avgResponseMinutes: number;
  vaccinationCompletionRate: number;
  chronicDiseaseCoverage: number;
}

export default function PublicHealthEmergencyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/public-health-emergency");
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
        <Title level={3} style={{ color: VI.deep }}>公共卫生应急</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="平均响应时长" value={data.avgResponseMinutes} suffix="分钟" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="疫苗接种完成率" value={data.vaccinationCompletionRate} suffix="%" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="慢病管理覆盖率" value={data.chronicDiseaseCoverage} suffix="%" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
