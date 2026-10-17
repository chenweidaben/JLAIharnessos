/**
 * 健澜科技 jlmedaios - 护士个人智能体使用统计 V13 页（M320-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ScenarioDist {
  medicationCheck: number;
  carePlan: number;
  riskAlert: number;
}

interface Resp {
  nurseId: string;
  callCount: number;
  scenarioDistribution: ScenarioDist;
  hitRate: number;
}

export default function NurseMuseUsagePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/nurse-muse-usage?nurseId=n1");
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
        <Title level={3} style={{ color: VI.deep }}>护士个人智能体使用统计</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="调用概览" style={{ marginBottom: 16 }}>
              <Statistic title="调用次数" value={data.callCount} style={{ marginRight: 48 }} />
              <Statistic title="命中率" value={data.hitRate} suffix="%" />
            </Card>
            <Card title="场景分布">
              <Statistic title="用药核对" value={data.scenarioDistribution.medicationCheck} style={{ marginRight: 24 }} />
              <Statistic title="护理计划" value={data.scenarioDistribution.carePlan} style={{ marginRight: 24 }} />
              <Statistic title="风险预警" value={data.scenarioDistribution.riskAlert} />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
