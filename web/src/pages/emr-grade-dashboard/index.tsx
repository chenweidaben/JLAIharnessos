/**
 * 健澜科技 jlmedaios - 电子病历等级评审仪表盘前端页（M462-D，V14，EMR 深化四模块，M462 收官）
 *
 * 深海蓝VI：仪表盘卡片（整体进度）+ 4 个指标进度条 + 当前等级徽章。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Badge, Card, Col, Layout, Progress, Row, Spin, Statistic, Tag, Typography } from "antd";
import type { GradeProgressItemV14 } from "@/bff/aggregators/emrGradeDashboardV14Aggregator";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DashboardData {
  overall: number;
  items: GradeProgressItemV14[];
  gradeLevel: string;
}

export default function EmrGradeDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({ overall: 0, items: [], gradeLevel: "" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-grade-dashboard", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const jsonData = await resp.json();
          if (!cancelled) setData(jsonData ?? { overall: 0, items: [], gradeLevel: "" });
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
        <Title level={3} style={{ color: VI.deep }}>电子病历等级评审仪表盘</Title>
        <Spin spinning={loading}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Statistic title="整体进度" value={data.overall} suffix="/ 100" valueStyle={{ color: VI.accent }} />
                <Progress percent={data.overall} strokeColor={VI.accent} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="当前等级" value={data.gradeLevel} valueStyle={{ color: VI.deep }} />
                <Badge count={data.gradeLevel} style={{ background: VI.mid, marginTop: 12 }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="指标数" value={data.items.length} suffix="项" valueStyle={{ color: VI.deep }} />
              </Card>
            </Col>
          </Row>
          <Card title="各项指标进度" headStyle={{ background: VI.deep, color: "#fff" }}>
            {data.items.map((item) => (
              <div key={item.key} style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 4 }}>
                  <Tag color="blue">{item.label}</Tag>
                  <span style={{ float: "right", color: VI.deep }}>{item.value}%</span>
                </div>
                <Progress percent={item.value} strokeColor={VI.accent} showInfo={false} />
              </div>
            ))}
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
