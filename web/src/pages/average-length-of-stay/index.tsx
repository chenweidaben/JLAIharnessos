/**
 * 健澜科技 jlmedaios - 平均住院日 V13 页（M334-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeptALOS {
  department: string;
  alos: number;
}

interface Resp {
  overallALOS: number;
  departmentALOS: DeptALOS[];
  varianceFromBenchmark: number;
}

export default function AverageLengthOfStayPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/average-length-of-stay");
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
        <Title level={3} style={{ color: VI.deep }}>平均住院日</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card>
                  <Statistic title="全院平均住院日" value={data.overallALOS} suffix="天" />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="与基准差值"
                    value={data.varianceFromBenchmark}
                    suffix="天"
                    valueStyle={{ color: data.varianceFromBenchmark <= 0 ? "#3f8600" : "#cf1322" }}
                  />
                </Card>
              </Col>
            </Row>
            <Card title="各科室平均住院日">
              <List
                dataSource={data.departmentALOS}
                renderItem={(item) => (
                  <List.Item>
                    {item.department}：
                    <Tag color="blue" style={{ marginLeft: 8 }}>{item.alos} 天</Tag>
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
