/**
 * 健澜科技 jlmedaios - 门诊等候时长 V13 页（M337-A）
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
  registrationWait: number;
  triageWait: number;
  paymentWait: number;
  pharmacyWait: number;
}

export default function OutpatientWaitPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/outpatient-wait");
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
        <Title level={3} style={{ color: VI.deep }}>门诊等候时长</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic title="挂号" value={data.registrationWait} suffix="分钟" />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="候诊" value={data.triageWait} suffix="分钟" />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="缴费" value={data.paymentWait} suffix="分钟" />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="取药" value={data.pharmacyWait} suffix="分钟" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
