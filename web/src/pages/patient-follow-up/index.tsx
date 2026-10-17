/**
 * 健澜科技 jlmedaios - 随访完成率 V13 页（M326-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  rate7Day: number;
  rate30Day: number;
  incompleteList: string[];
}

export default function PatientFollowUpPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/patient-follow-up");
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
        <Title level={3} style={{ color: VI.deep }}>随访完成率</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card>
                  <Statistic title="7 天随访完成率" value={data.rate7Day} suffix="%" />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic title="30 天随访完成率" value={data.rate30Day} suffix="%" />
                </Card>
              </Col>
            </Row>
            <Card title="未完成名单（7 天）">
              <List
                dataSource={data.incompleteList}
                renderItem={(item) => <List.Item>{item}</List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
