/**
 * 健澜科技 jlmedaios - 病理报告 TAT V13 页（M342-B）
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
  routineTat: number;
  intraOpTat: number;
  frozenTat: number;
}

export default function PathologyTurnaroundPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/pathology-turnaround");
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
        <Title level={3} style={{ color: VI.deep }}>病理报告 TAT</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="常规病理 TAT" value={data.routineTat} suffix="小时" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="术中 TAT" value={data.intraOpTat} suffix="小时" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="冰冻 TAT" value={data.frozenTat} suffix="小时" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
