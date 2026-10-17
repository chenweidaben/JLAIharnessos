/**
 * 健澜科技 jlmedaios - 影像 AI 使用统计 V13 页（M325-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface OrganGroup {
  organ: string;
  count: number;
}

interface Resp {
  monthlyCalls: number;
  detectionRate: number;
  organDistribution: OrganGroup[];
}

export default function ImagingAiUsagePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/imaging-ai-usage");
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
        <Title level={3} style={{ color: VI.deep }}>影像 AI 使用统计</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card>
                  <Statistic title="本月调用量" value={data.monthlyCalls} />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic title="检出率" value={data.detectionRate} suffix="%" />
                </Card>
              </Col>
            </Row>
            <Card title="器官分布">
              <List
                dataSource={data.organDistribution}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta title={item.organ} description={`${item.count} 次`} />
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
