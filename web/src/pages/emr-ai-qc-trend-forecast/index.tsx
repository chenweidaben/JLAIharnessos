/**
 * 健澜科技 jlmedaios - 病历AI质控趋势预测前端页（M549-D，V14，EMR 深化四模块，M549 收官）
 *
 * 深海蓝VI：病历AI质控趋势预测（病历ID/科室/当前合格率/月改善幅度/下月预测合格率/预测方向）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiQcTrendForecast {
  recordId: string;
  dept: string;
}

interface TrendResult {
  nextMonthRate: number;
  direction: string;
}

interface TrendReport {
  nextMonthRate: number;
  direction: string;
}

const directionColor = (direction: string): string => {
  if (direction === "上升") return "green";
  if (direction === "下降") return "red";
  return "blue";
};

const directionIcon = (direction: string): string => {
  if (direction === "上升") return "↑";
  if (direction === "下降") return "↓";
  return "→";
};

export default function EmrAiQcTrendForecastPage() {
  const [base, setBase] = useState<AiQcTrendForecast | null>(null);
  const [currentPassRate, setCurrentPassRate] = useState(85.0);
  const [monthlyImprove, setMonthlyImprove] = useState(3.5);
  const [result, setResult] = useState<TrendResult | null>(null);
  const [report, setReport] = useState<TrendReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-qc-trend-forecast", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 趋势预测基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doForecast = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-qc-trend-forecast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ currentPassRate, monthlyImprove }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("趋势预测完成");
      } else {
        message.error("趋势预测失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历AI质控趋势预测</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="预测输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>当前合格率：</Text>
              <Input
                type="number"
                step="0.1"
                value={currentPassRate}
                onChange={(e) => setCurrentPassRate(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>月改善幅度：</Text>
              <Input
                type="number"
                step="0.1"
                value={monthlyImprove}
                onChange={(e) => setMonthlyImprove(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doForecast}>
            预测趋势
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="趋势预测结果">
            <Row gutter={24}>
              <Col span={12}>
                <Statistic
                  title="下月预测合格率"
                  value={report.nextMonthRate}
                  suffix="%"
                  precision={1}
                  valueStyle={{ color: report.direction === "上升" ? "#3f8600" : report.direction === "下降" ? "#cf1322" : VI.accent }}
                />
              </Col>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>预测方向：</Text>
                  <Tag color={directionColor(report.direction)} style={{ marginLeft: 8, fontSize: 16 }}>
                    {directionIcon(report.direction)} {report.direction}
                  </Tag>
                </div>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
