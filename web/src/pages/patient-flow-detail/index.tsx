/**
 * 健澜科技 jlmedaios - 患者流明细 V13 页（M381-C）
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
  avgWaitingMinutes: number;
  avgLOSDays: number;
  bedTurnoverCount: number;
}

export default function PatientFlowDetailPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/patient-flow-detail");
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
        <Title level={3} style={{ color: VI.deep }}>患者流明细</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="平均候诊时长" value={data.avgWaitingMinutes} suffix="分钟" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="平均住院日" value={data.avgLOSDays} suffix="天" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="床位周转次数" value={data.bedTurnoverCount} suffix="次" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
