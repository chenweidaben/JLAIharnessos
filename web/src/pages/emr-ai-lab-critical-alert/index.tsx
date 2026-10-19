/**
 * 健澜科技 jlmedaios - 病历AI检验危急值智能提醒前端页（M561-D，V14，EMR 深化四模块，M561 收官）
 *
 * 深海蓝VI：病历AI检验危急值智能提醒（病历ID/科室/检验项目/检验值/低限/高限/是否危急/预警级别/处理建议）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, InputNumber, Layout, Row, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiLabCriticalAlert {
  recordId: string;
  dept: string;
}

interface AlertResult {
  isCritical: boolean;
  alertLevel: string;
  advice: string;
}

interface AlertReport {
  isCritical: boolean;
  alertLevel: string;
  advice: string;
}

function levelColor(l: string): string {
  if (l === "偏低危急" || l === "偏高危急") return "red";
  return "green";
}

export default function EmrAiLabCriticalAlertPage() {
  const [base, setBase] = useState<AiLabCriticalAlert | null>(null);
  const [testName, setTestName] = useState("血钾");
  const [value, setValue] = useState(6.5);
  const [lowLimit, setLowLimit] = useState(3.5);
  const [highLimit, setHighLimit] = useState(5.5);
  const [result, setResult] = useState<AlertResult | null>(null);
  const [report, setReport] = useState<AlertReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-lab-critical-alert", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 检验危急值智能提醒基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doAlert = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-lab-critical-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ testName, value, lowLimit, highLimit }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("危急值智能提醒完成");
      } else {
        message.error("危急值智能提醒失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI检验危急值智能提醒</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="提醒输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>检验项目：</Text>
            <Input value={testName} onChange={(e) => setTestName(e.target.value)} style={{ width: 140 }} />
            <Text strong>检验值：</Text>
            <InputNumber value={value} onChange={(v) => setValue(Number(v ?? 0))} />
            <Text strong>低限：</Text>
            <InputNumber value={lowLimit} onChange={(v) => setLowLimit(Number(v ?? 0))} />
            <Text strong>高限：</Text>
            <InputNumber value={highLimit} onChange={(v) => setHighLimit(Number(v ?? 0))} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doAlert}>
              危急值判定
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="提醒结果">
            <Row gutter={24}>
              <Col span={8}>
                <Text strong style={{ fontSize: 16 }}>是否危急：</Text>
                <Tag color={report.isCritical ? "red" : "green"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.isCritical ? "危急" : "正常"}
                </Tag>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: 16 }}>预警级别：</Text>
                <Tag color={levelColor(report.alertLevel)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.alertLevel}
                </Tag>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: 16 }}>处理建议：</Text>
                <Tag color={report.isCritical ? "orange" : "blue"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.advice}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
