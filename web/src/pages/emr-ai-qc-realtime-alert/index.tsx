/**
 * 健澜科技 jlmedaios - 病历AI质控实时预警前端页（M549-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI质控实时预警（病历ID/科室/缺陷数/预警阈值/是否触发/预警级别）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiQcRealtimeAlert {
  recordId: string;
  dept: string;
}

interface AlertResult {
  triggered: boolean;
  level: string;
}

interface AlertReport {
  triggered: boolean;
  level: string;
}

const levelColor = (level: string): string => {
  if (level === "红色") return "red";
  if (level === "橙色") return "orange";
  return "green";
};

export default function EmrAiQcRealtimeAlertPage() {
  const [base, setBase] = useState<AiQcRealtimeAlert | null>(null);
  const [defectCount, setDefectCount] = useState(20);
  const [threshold, setThreshold] = useState(5);
  const [result, setResult] = useState<AlertResult | null>(null);
  const [report, setReport] = useState<AlertReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-qc-realtime-alert", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 实时预警基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-qc-realtime-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ defectCount, threshold }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("预警检查完成");
      } else {
        message.error("预警检查失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI质控实时预警</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="预警输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>缺陷数：</Text>
              <Input
                type="number"
                value={defectCount}
                onChange={(e) => setDefectCount(Number(e.target.value))}
                style={{ width: 100, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>预警阈值：</Text>
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                style={{ width: 100, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCheck}>
            检查实时预警
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="预警检查结果">
            <Row gutter={24}>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>是否触发：</Text>
                  <Switch
                    checked={report.triggered}
                    style={{ marginLeft: 8 }}
                    checkedChildren="触发"
                    unCheckedChildren="未触发"
                  />
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>预警级别：</Text>
                  <Tag color={levelColor(report.level)} style={{ marginLeft: 8, fontSize: 16 }}>
                    {report.level}
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
