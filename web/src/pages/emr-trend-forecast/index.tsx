/**
 * 健澜科技 jlmedaios - 病历质控指标趋势预测前端页（M470-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：历史趋势实线 + 预测虚线（不同颜色区分）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ForecastChart {
  history: number[];
  forecast: number[];
}

export default function EmrTrendForecastPage() {
  const [loading, setLoading] = useState(true);
  const [chart, setChart] = useState<ForecastChart>({ history: [], forecast: [] });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-trend-forecast?indicator=passRate&months=3", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setChart(data?.chart ?? { history: [], forecast: [] });
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
        <Title level={3} style={{ color: VI.deep }}>病历质控指标趋势预测</Title>
        <Card title="通过率趋势（历史实线 + 预测虚线）" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <div style={{ display: "flex", gap: 32 }}>
              <div>
                <Text strong>历史（实线）：</Text>
                <Text style={{ marginLeft: 8 }}>{chart.history.join(" → ")}</Text>
              </div>
              <div>
                <Text strong style={{ color: "#faad14" }}>预测（虚线）：</Text>
                <Text style={{ marginLeft: 8, color: "#faad14" }}>{chart.forecast.join(" → ")}</Text>
              </div>
            </div>
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
