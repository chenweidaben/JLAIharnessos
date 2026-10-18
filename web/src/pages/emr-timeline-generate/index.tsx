/**
 * 健澜科技 jlmedaios - 病历时间轴生成前端页（M538-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历时间轴生成（病历ID/患者姓名/入院日期/出院日期/事件数/总天数/密度）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Timeline {
  recordId: string;
  patientName: string;
}

interface GenerateResult {
  totalDays: number;
  density: string;
}

interface GenerateReport {
  totalDays: number;
  density: string;
}

export default function EmrTimelineGeneratePage() {
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [admissionDate, setAdmissionDate] = useState("2026-10-01");
  const [dischargeDate, setDischargeDate] = useState("2026-10-08");
  const [eventCount, setEventCount] = useState(25);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [report, setReport] = useState<GenerateReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-timeline-generate", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setTimeline(data?.data ?? null);
        }
      } catch {
        message.error("加载时间轴基础数据失败");
      }
    };
    void fetchTimeline();
  }, []);

  const doGenerate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-timeline-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ admissionDate, dischargeDate, eventCount }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("生成完成");
      } else {
        message.error("生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历时间轴生成</Title>
        {timeline && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{timeline.recordId}</Text>
              <Text strong>患者姓名：</Text><Text>{timeline.patientName}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="生成输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>入院日期：</Text>
              <Input value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>出院日期：</Text>
              <Input value={dischargeDate} onChange={(e) => setDischargeDate(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>事件数：</Text>
              <Input
                type="number"
                value={eventCount}
                onChange={(e) => setEventCount(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doGenerate}>
            执行生成
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="生成结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="总天数" value={report.totalDays} />
              <div>
                <Text strong>密度：</Text>
                <Tag color={report.density === "密集" ? "red" : report.density === "适中" ? "blue" : "green"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.density}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
