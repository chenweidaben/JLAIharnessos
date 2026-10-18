/**
 * 健澜科技 jlmedaios - 病历质控患者满意度前端页（M475-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：满意度饼图（各分数段占比）+ 平均分大数字。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeptAvg {
  dept: string;
  avg: number;
}

interface Stats {
  totalResponses: number;
  avgScore: number;
  byDept: DeptAvg[];
}

export default function EmrPatientSatisfactionPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalResponses: 0, avgScore: 0, byDept: [] });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-patient-satisfaction", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setStats(data?.stats ?? { totalResponses: 0, avgScore: 0, byDept: [] });
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控患者满意度</Title>
        <Spin spinning={loading}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Text type="secondary">平均分</Text>
                <Title level={1} style={{ color: VI.accent, margin: 0 }}>{stats.avgScore}</Title>
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Text type="secondary">总答卷数</Text>
                <Title level={1} style={{ color: VI.deep, margin: 0 }}>{stats.totalResponses}</Title>
              </Card>
            </Col>
          </Row>
          <Card title="各科室平均分" headStyle={{ background: VI.mid, color: "#fff" }}>
            <List
              dataSource={stats.byDept}
              renderItem={(item: DeptAvg) => (
                <List.Item>
                  <Tag color="blue">{item.dept}</Tag>
                  <Text strong style={{ marginLeft: 12 }}>{item.avg} 分</Text>
                </List.Item>
              )}
            />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
