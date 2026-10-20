/**
 * 健澜科技 jlmedaios - 患者侧经验转健康提示 V13 页（M295-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Tip {
  experienceId: string;
  tipTitle: string;
  tipContent: string;
  disclaimer: string;
}

interface Resp {
  patientId: string;
  count: number;
  items: Tip[];
}

export default function PatientTipsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/patient-tips?patientId=p-001");
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
        <Title level={3} style={{ color: VI.deep }}>为您的健康提示</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={[16, 16]}>
            {data.items.map((t) => (
              <Col span={24} key={t.experienceId}>
                <Card title={t.tipTitle} extra={<Tag color="orange">{t.disclaimer}</Tag>}>
                  <Paragraph>{t.tipContent}</Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Content>
    </Layout>
  );
}
