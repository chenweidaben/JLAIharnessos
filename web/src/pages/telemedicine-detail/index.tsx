/**
 * 健澜科技 jlmedaios - 远程医疗明细 V13 页（M399-B，避让旧版 telemedicine/telemedicine-stats）
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
  remoteConsultationCount: number;
  remoteImagingDiagnosisCount: number;
  remoteOutpatientCount: number;
}

export default function TelemedicineDetailPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/telemedicine-detail");
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
        <Title level={3} style={{ color: VI.deep }}>远程医疗明细</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="远程会诊数" value={data.remoteConsultationCount} suffix="次" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="远程影像诊断数" value={data.remoteImagingDiagnosisCount} suffix="例" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="远程门诊数" value={data.remoteOutpatientCount} suffix="次" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
