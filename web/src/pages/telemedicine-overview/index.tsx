/**
 * 健澜科技 jlmedaios - 远程会诊量 V13 页（M324-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeptDistribution {
  dept: string;
  count: number;
}

interface Resp {
  monthlyConsultations: number;
  avgResponseMinutes: number;
  deptDistribution: DeptDistribution[];
}

export default function TelemedicineOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/telemedicine-overview");
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
        <Title level={3} style={{ color: VI.deep }}>远程会诊量</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card>
                  <Statistic title="本月会诊次数" value={data.monthlyConsultations} />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic title="平均响应时长" value={data.avgResponseMinutes} suffix="分钟" />
                </Card>
              </Col>
            </Row>
            <Card title="科室分布">
              <List
                dataSource={data.deptDistribution}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta title={item.dept} description={`${item.count} 次`} />
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
