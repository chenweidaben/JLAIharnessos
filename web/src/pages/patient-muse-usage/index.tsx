/**
 * 健澜科技 jlmedaios - 患者个人智能体使用统计 V13 页（M320-D）
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
  healthReminder: number;
  medicationConsult: number;
  reportInterpret: number;
  appointment: number;
}

interface Resp {
  monthlyActive: number;
  scenarioDistribution: ScenarioDist;
  nextDayRetention: number;
}

export default function PatientMuseUsagePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/patient-muse-usage");
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
        <Title level={3} style={{ color: VI.deep }}>患者个人智能体使用统计</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="使用概览" style={{ marginBottom: 16 }}>
              <Statistic title="月活患者数" value={data.monthlyActive} style={{ marginRight: 48 }} />
              <Statistic title="次日留存率" value={data.nextDayRetention} suffix="%" />
            </Card>
            <Card title="场景分布">
              <Statistic title="健康提醒" value={data.scenarioDistribution.healthReminder} style={{ marginRight: 24 }} />
              <Statistic title="用药咨询" value={data.scenarioDistribution.medicationConsult} style={{ marginRight: 24 }} />
              <Statistic title="报告解读" value={data.scenarioDistribution.reportInterpret} style={{ marginRight: 24 }} />
              <Statistic title="预约挂号" value={data.scenarioDistribution.appointment} />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
