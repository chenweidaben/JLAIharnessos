/**
 * 健澜科技 jlmedaios - 病历AI质控异常监控前端页（M549-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI质控异常监控（病历ID/科室/当前缺陷数/历史平均/是否异常/偏差率%）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiQcAnomalyMonitor {
  recordId: string;
  dept: string;
}

interface AnomalyResult {
  isAnomaly: boolean;
  deviation: number;
}

interface AnomalyReport {
  isAnomaly: boolean;
  deviation: number;
}

export default function EmrAiQcAnomalyMonitorPage() {
  const [base, setBase] = useState<AiQcAnomalyMonitor | null>(null);
  const [currentDefect, setCurrentDefect] = useState(15);
  const [avgDefect, setAvgDefect] = useState(5);
  const [result, setResult] = useState<AnomalyResult | null>(null);
  const [report, setReport] = useState<AnomalyReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-qc-anomaly-monitor", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 异常监控基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doMonitor = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-qc-anomaly-monitor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ currentDefect, avgDefect }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("异常监控完成");
      } else {
        message.error("异常监控失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI质控异常监控</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="监控输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>当前缺陷数：</Text>
              <Input
                type="number"
                value={currentDefect}
                onChange={(e) => setCurrentDefect(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>历史平均：</Text>
              <Input
                type="number"
                value={avgDefect}
                onChange={(e) => setAvgDefect(Number(e.target.value))}
                style={{ width: 100, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doMonitor}>
            监控异常
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="异常监控结果">
            <Row gutter={24}>
              <Col span={8}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>是否异常：</Text>
                  <Switch
                    checked={report.isAnomaly}
                    style={{ marginLeft: 8 }}
                    checkedChildren="异常"
                    unCheckedChildren="正常"
                  />
                </div>
              </Col>
              <Col span={8}>
                <Statistic title="偏差率" value={report.deviation} suffix="%" valueStyle={{ color: report.isAnomaly ? "#cf1322" : VI.accent }} />
              </Col>
              <Col span={8}>
                <div>
                  <Tag color={report.isAnomaly ? "red" : "green"} style={{ fontSize: 16 }}>
                    {report.isAnomaly ? "异常升高" : "正常波动"}
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
