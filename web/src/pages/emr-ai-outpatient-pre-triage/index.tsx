/**
 * 健澜科技 jlmedaios - 病历AI门诊预检分诊前端页（M560-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI门诊预检分诊（病历ID/科室/症状/发热/推荐科室/就诊优先级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Input, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiOutpatientPreTriage {
  recordId: string;
  dept: string;
}

interface PreTriageResult {
  department: string;
  priority: string;
}

interface PreTriageReport {
  department: string;
  priority: string;
}

export default function EmrAiOutpatientPreTriagePage() {
  const [base, setBase] = useState<AiOutpatientPreTriage | null>(null);
  const [symptom, setSymptom] = useState("咳嗽伴咳痰");
  const [fever, setFever] = useState(true);
  const [result, setResult] = useState<PreTriageResult | null>(null);
  const [report, setReport] = useState<PreTriageReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-outpatient-pre-triage", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 门诊预检分诊基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doPreTriage = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-outpatient-pre-triage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ symptom, fever }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("门诊预检分诊完成");
      } else {
        message.error("门诊预检分诊失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI门诊预检分诊</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="分诊输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>症状：</Text>
            <Input value={symptom} onChange={(e) => setSymptom(e.target.value)} style={{ width: 240 }} />
            <Text strong>发热：</Text>
            <Switch checked={fever} onChange={setFever} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doPreTriage}>
              预检分诊
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="分诊结果">
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>推荐科室：</Text>
                <Tag color="geekblue" style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.department}
                </Tag>
              </div>
              <div>
                <Text strong style={{ fontSize: 16 }}>就诊优先级：</Text>
                <Tag color={report.priority === "优先就诊" ? "red" : "default"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.priority}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
