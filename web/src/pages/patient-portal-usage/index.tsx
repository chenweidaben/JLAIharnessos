/**
 * 健澜科技 jlmedaios - 患者门户使用度 V13 页（M316-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface FeatureRates {
  appointment: number;
  reportQuery: number;
  onlinePayment: number;
  messageCenter: number;
}

interface Resp {
  monthlyActiveRate: number;
  featureRates: FeatureRates;
  lowUsagePatients: string[];
}

export default function PatientPortalUsagePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/patient-portal-usage");
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
        <Title level={3} style={{ color: VI.deep }}>患者门户使用度</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="月活率" style={{ marginBottom: 16 }}>
              <Statistic title="月活率" value={data.monthlyActiveRate} suffix="%" />
            </Card>
            <Card title="功能使用率" style={{ marginBottom: 16 }}>
              <Statistic title="预约" value={data.featureRates.appointment} suffix="%" style={{ marginRight: 24 }} />
              <Statistic title="报告查询" value={data.featureRates.reportQuery} suffix="%" style={{ marginRight: 24 }} />
              <Statistic title="在线支付" value={data.featureRates.onlinePayment} suffix="%" style={{ marginRight: 24 }} />
              <Statistic title="消息中心" value={data.featureRates.messageCenter} suffix="%" />
            </Card>
            <Card title="低使用患者（30天未登录）">
              <List
                dataSource={data.lowUsagePatients}
                renderItem={(uid) => (
                  <List.Item>
                    <Tag color="red">{uid}</Tag>
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
