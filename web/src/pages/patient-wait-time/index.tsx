/**
 * 健澜科技 jlmedaios - 患者等候时长 V13 页（M326-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface StageWaitItem {
  stage: string;
  avgMinutes: number;
  isOverdue: boolean;
}

interface Resp {
  stages: StageWaitItem[];
}

export default function PatientWaitTimePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/patient-wait-time");
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
        <Title level={3} style={{ color: VI.deep }}>患者等候时长</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            {data.stages.map((item) => (
              <Col span={6} key={item.stage}>
                <Card>
                  <Statistic title={item.stage} value={item.avgMinutes} suffix="分钟" />
                  {item.isOverdue ? (
                    <Tag color="red" style={{ marginTop: 8 }}>红牌</Tag>
                  ) : (
                    <Tag color="green" style={{ marginTop: 8 }}>正常</Tag>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Content>
    </Layout>
  );
}
