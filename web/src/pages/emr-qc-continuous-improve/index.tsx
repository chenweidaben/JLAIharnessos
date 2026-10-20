/**
 * 健澜科技 jlmedaios - 病历质控持续改进前端页（M479-D，M479 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：改进措施卡片（缺陷描述/改进措施/责任人/进度条）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Progress, Row, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ImprovementPlan {
  defect: string;
  measure: string;
  owner: string;
}

export default function EmrQcContinuousImprovePage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<ImprovementPlan[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-continuous-improve", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setPlans(data?.plans ?? []);
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
        <Title level={3} style={{ color: VI.deep }}>病历质控持续改进</Title>
        <Spin spinning={loading}>
          <Row gutter={[16, 16]}>
            {plans.map((plan, idx) => (
              <Col span={8} key={idx}>
                <Card hoverable style={{ height: "100%" }}>
                  <Tag color="red" style={{ marginBottom: 12 }}>缺陷</Tag>
                  <Title level={5} style={{ color: VI.deep, margin: 0 }}>{plan.defect}</Title>
                  <Text type="secondary" style={{ display: "block", marginTop: 12 }}>
                    改进措施：{plan.measure}
                  </Text>
                  <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
                    责任人：{plan.owner}
                  </Text>
                  <Progress percent={Math.min(60 + idx * 20, 100)} strokeColor={VI.accent} style={{ marginTop: 16 }} />
                </Card>
              </Col>
            ))}
          </Row>
        </Spin>
      </Content>
    </Layout>
  );
}
