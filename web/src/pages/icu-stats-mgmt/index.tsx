/**
 * 健澜科技 jlmedaios - ICU 管理（统计视角）V13 页（M454-D，M454 收官，门急诊与手术麻醉管理组）
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
  icuStatsBedUtilizationRate: number;
  icuStatsCriticalRescueSuccessRate: number;
  icuStatsAverageLengthOfStay: number;
}

export default function IcuStatsMgmtPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/icu-stats-mgmt");
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
        <Title level={3} style={{ color: VI.deep }}>ICU 管理（统计视角）</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="ICU 床位使用率" value={data.icuStatsBedUtilizationRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="危重患者抢救成功率" value={data.icuStatsCriticalRescueSuccessRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="ICU 平均住院日" value={data.icuStatsAverageLengthOfStay} suffix="天" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
