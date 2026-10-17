/**
 * 健澜科技 jlmedaios - 互联网医院明细 V13 页（M399-A，避让旧版 internet-hospital/internet-hospital-stats）
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
  onlineConsultationCount: number;
  onlinePrescriptionCount: number;
  followupVisitRate: number;
}

export default function InternetHospitalDetailPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/internet-hospital-detail");
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
        <Title level={3} style={{ color: VI.deep }}>互联网医院明细</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="在线问诊数" value={data.onlineConsultationCount} suffix="次" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="在线处方数" value={data.onlinePrescriptionCount} suffix="张" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="复诊率" value={data.followupVisitRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
