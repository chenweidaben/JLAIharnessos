/**
 * 健澜科技 jlmedaios - 病历AI不良事件主动识别前端页（M559-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI不良事件主动识别（病历ID/科室/跌倒/压疮/用药错误/感染/事件数/级别）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, Row, Statistic, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiAdverseEventDetect {
  recordId: string;
  dept: string;
}

interface DetectResult {
  eventCount: number;
  level: string;
}

interface DetectReport {
  eventCount: number;
  level: string;
}

function levelColor(l: string): string {
  if (l === "严重不良事件") return "red";
  if (l === "一般不良事件") return "orange";
  return "green";
}

export default function EmrAiAdverseEventDetectPage() {
  const [base, setBase] = useState<AiAdverseEventDetect | null>(null);
  const [hasFall, setHasFall] = useState(false);
  const [hasPressureUlcer, setHasPressureUlcer] = useState(false);
  const [hasMedError, setHasMedError] = useState(false);
  const [hasInfection, setHasInfection] = useState(false);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [report, setReport] = useState<DetectReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-adverse-event-detect", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 不良事件主动识别基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doDetect = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-adverse-event-detect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ hasFall, hasPressureUlcer, hasMedError, hasInfection }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("不良事件识别完成");
      } else {
        message.error("不良事件识别失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const items: Array<{ label: string; value: boolean; set: (v: boolean) => void }> = [
    { label: "跌倒", value: hasFall, set: setHasFall },
    { label: "压疮", value: hasPressureUlcer, set: setHasPressureUlcer },
    { label: "用药错误", value: hasMedError, set: setHasMedError },
    { label: "感染", value: hasInfection, set: setHasInfection },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历AI不良事件主动识别</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="识别输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            {items.map((it) => (
              <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text strong>{it.label}：</Text>
                <Switch checked={it.value} onChange={it.set} />
              </div>
            ))}
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doDetect}>
              主动识别
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="识别结果">
            <Row gutter={24}>
              <Col span={12}>
                <Statistic title="事件数" value={report.eventCount} suffix="起" />
              </Col>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>级别：</Text>
                <Tag color={levelColor(report.level)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.level}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
