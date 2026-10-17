/**
 * 健澜科技 jlmedaios - 员工满意度 V13 页（M322-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface GroupSatisfaction {
  doctor: number;
  nurse: number;
  admin: number;
}

interface Resp {
  groupSatisfaction: GroupSatisfaction;
  turnoverIntentionRate: number;
}

export default function StaffSatisfactionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/staff-satisfaction");
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
        <Title level={3} style={{ color: VI.deep }}>员工满意度</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card>
                  <Statistic title="医师满意度" value={data.groupSatisfaction.doctor} suffix="/5" />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="护士满意度" value={data.groupSatisfaction.nurse} suffix="/5" />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="行政满意度" value={data.groupSatisfaction.admin} suffix="/5" />
                </Card>
              </Col>
            </Row>
            <Card>
              <Statistic title="离职倾向占比" value={data.turnoverIntentionRate} suffix="%" />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
