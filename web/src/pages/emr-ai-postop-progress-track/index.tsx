/**
 * 健澜科技 jlmedaios - 病历AI术后病程跟踪前端页（M555-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI术后病程跟踪（病历ID/科室/术后第几天/是否发热/伤口愈合/恢复状态/预计出院天数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, InputNumber, Layout, Row, Switch, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiPostopProgressTrack {
  recordId: string;
  dept: string;
}

interface TrackResult {
  recoveryStatus: string;
  daysToDischarge: number;
}

interface TrackReport {
  recoveryStatus: string;
  daysToDischarge: number;
}

function statusColor(s: string): string {
  if (s === "恢复良好") return "green";
  if (s === "观察中") return "orange";
  return "red";
}

export default function EmrAiPostopProgressTrackPage() {
  const [base, setBase] = useState<AiPostopProgressTrack | null>(null);
  const [postopDay, setPostopDay] = useState(5);
  const [hasFever, setHasFever] = useState(false);
  const [woundHealed, setWoundHealed] = useState(true);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [report, setReport] = useState<TrackReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-postop-progress-track", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 术后病程跟踪基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doTrack = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-postop-progress-track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ postopDay, hasFever, woundHealed }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("术后病程跟踪完成");
      } else {
        message.error("术后病程跟踪失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI术后病程跟踪</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="跟踪输入">
          <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>术后第几天：</Text>
            <InputNumber min={0} max={30} value={postopDay} onChange={(v) => setPostopDay(Number(v ?? 0))} />
            <Text strong>是否发热：</Text>
            <Switch checked={hasFever} onChange={setHasFever} />
            <Text strong>伤口愈合：</Text>
            <Switch checked={woundHealed} onChange={setWoundHealed} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doTrack}>
              开始跟踪
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="跟踪结果">
            <Row gutter={24}>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>恢复状态：</Text>
                <Tag color={statusColor(report.recoveryStatus)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.recoveryStatus}
                </Tag>
              </Col>
              <Col span={12}>
                <Statistic title="预计出院天数" value={report.daysToDischarge} suffix="天" valueStyle={{ color: VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
