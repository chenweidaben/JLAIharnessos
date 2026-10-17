/**
 * 健澜科技 jlmedaios - 患者投诉处理 V13 页（M326-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ComplaintTypeItem {
  type: string;
  count: number;
}

interface Resp {
  monthlyComplaints: number;
  timelinessRate: number;
  typeDistribution: ComplaintTypeItem[];
}

export default function PatientComplaintPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/patient-complaint");
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
        <Title level={3} style={{ color: VI.deep }}>患者投诉处理</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card>
                  <Statistic title="本月投诉数" value={data.monthlyComplaints} />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic title="处理及时率" value={data.timelinessRate} suffix="%" />
                </Card>
              </Col>
            </Row>
            <Card title="类型分布">
              <List
                dataSource={data.typeDistribution}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta title={item.type} description={`${item.count} 件`} />
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
