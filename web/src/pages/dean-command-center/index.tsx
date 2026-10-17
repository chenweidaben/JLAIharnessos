/**
 * 健澜科技 jlmedaios - 院长指挥中心一屏总览 V13 页（M311-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Alert, Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface CardData {
  flywheelScore: number;
  closureRate: number;
  satisfactionRate: number;
  workloadHealth: number;
  eventSafety: number;
  overallScore: number;
  redLightCount: number;
}

interface Resp {
  card: CardData;
  alert: string;
}

function light(score: number): string {
  if (score < 60) return "red";
  if (score < 80) return "orange";
  return "green";
}

export default function DeanCommandCenterPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/dean-command-center");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>院长指挥中心</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            {data.alert === "存在紧急风险" && (
              <Alert type="error" message={data.alert} showIcon style={{ marginBottom: 16 }} />
            )}
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="综合分" value={data.card.overallScore} />
              <Tag color="red" style={{ marginTop: 12 }}>红灯维度 {data.card.redLightCount}</Tag>
            </Card>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="飞轮健康" value={data.card.flywheelScore} /><Tag color={light(data.card.flywheelScore)}>健康</Tag></Card></Col>
              <Col span={8}><Card><Statistic title="闭环率" value={data.card.closureRate} /><Tag color={light(data.card.closureRate)}>闭环</Tag></Card></Col>
              <Col span={8}><Card><Statistic title="满意度" value={data.card.satisfactionRate} /><Tag color={light(data.card.satisfactionRate)}>满意</Tag></Card></Col>
              <Col span={8}><Card style={{ marginTop: 16 }}><Statistic title="疲劳度" value={data.card.workloadHealth} /><Tag color={light(data.card.workloadHealth)}>疲劳</Tag></Card></Col>
              <Col span={8}><Card style={{ marginTop: 16 }}><Statistic title="不良事件安全" value={data.card.eventSafety} /><Tag color={light(data.card.eventSafety)}>安全</Tag></Card></Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
