/**
 * 健澜科技 jlmedaios - 病历质控指标对标分析前端页（M471-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：对标卡片（本院值/标杆值/差距徽章绿红）+ 改进建议。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface BenchmarkResult {
  current: number;
  benchmark: number;
  gap: number;
  direction: "above" | "below" | "equal";
}

export default function EmrBenchmarkPage() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [suggestion, setSuggestion] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-benchmark?indicator=passRate", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setResult(data?.result ?? null);
            setSuggestion(data?.analysis?.suggestion ?? "");
          }
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const gapTag = (gap: number) => {
    if (gap > 0) return <Tag color="green">+{gap} 优于标杆</Tag>;
    if (gap < 0) return <Tag color="red">{gap} 低于标杆</Tag>;
    return <Tag color="default">0 持平</Tag>;
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控指标对标分析</Title>
        <Spin spinning={loading}>
          {result && (
            <Card title="通过率对标" headStyle={{ background: VI.mid, color: "#fff" }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="本院值" value={result.current} suffix="%" />
                </Col>
                <Col span={8}>
                  <Statistic title="标杆值" value={result.benchmark} suffix="%" />
                </Col>
                <Col span={8}>
                  <Text strong>差距：</Text>
                  <span style={{ marginLeft: 8 }}>{gapTag(result.gap)}</span>
                </Col>
              </Row>
              <Card type="inner" title="改进建议" style={{ marginTop: 24 }}>
                <Text>{suggestion}</Text>
              </Card>
            </Card>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
