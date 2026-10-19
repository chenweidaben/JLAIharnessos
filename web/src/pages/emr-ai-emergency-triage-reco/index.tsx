/**
 * 健澜科技 jlmedaios - 病历AI急诊分诊分级推荐前端页（M560-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI急诊分诊分级推荐（病历ID/科室/症状/生命体征异常/分诊级别/等待时间分钟）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Input, Statistic, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiEmergencyTriageReco {
  recordId: string;
  dept: string;
}

interface RecoResult {
  level: string;
  waitTime: number;
}

interface RecoReport {
  level: string;
  waitTime: number;
}

function levelColor(l: string): string {
  if (l.includes("一级")) return "red";
  if (l.includes("二级")) return "orange";
  return "blue";
}

export default function EmrAiEmergencyTriageRecoPage() {
  const [base, setBase] = useState<AiEmergencyTriageReco | null>(null);
  const [symptom, setSymptom] = useState("胸痛伴呼吸困难");
  const [vitalAbnormal, setVitalAbnormal] = useState(true);
  const [result, setResult] = useState<RecoResult | null>(null);
  const [report, setReport] = useState<RecoReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-emergency-triage-reco", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 急诊分诊分级推荐基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doReco = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-emergency-triage-reco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ symptom, vitalAbnormal }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("急诊分诊分级推荐完成");
      } else {
        message.error("急诊分诊分级推荐失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI急诊分诊分级推荐</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="推荐输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>症状：</Text>
            <Input value={symptom} onChange={(e) => setSymptom(e.target.value)} style={{ width: 240 }} />
            <Text strong>生命体征异常：</Text>
            <Switch checked={vitalAbnormal} onChange={setVitalAbnormal} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doReco}>
              分诊推荐
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="推荐结果">
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>分诊级别：</Text>
                <Tag color={levelColor(report.level)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.level}
                </Tag>
              </div>
              <Statistic title="等待时间" value={report.waitTime} suffix="分钟" />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
