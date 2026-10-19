/**
 * 健澜科技 jlmedaios - 病历AI慢病管理计划推荐前端页（M563-D，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI慢病管理计划推荐（病历ID/科室/慢病类型/控制状态/推荐管理计划/监测频次）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Input, Select, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiChronicCarePlanReco {
  recordId: string;
  dept: string;
}

interface RecoResult {
  planName: string;
  monitorFrequency: string;
}

interface RecoReport {
  planName: string;
  monitorFrequency: string;
}

function freqColor(f: string): string {
  if (f === "每周监测") return "red";
  if (f === "每两周监测") return "orange";
  return "green";
}

export default function EmrAiChronicCarePlanRecoPage() {
  const [base, setBase] = useState<AiChronicCarePlanReco | null>(null);
  const [disease, setDisease] = useState("原发性高血压");
  const [controlStatus, setControlStatus] = useState("控制不佳");
  const [result, setResult] = useState<RecoResult | null>(null);
  const [report, setReport] = useState<RecoReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-chronic-care-plan-reco", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 慢病管理计划推荐基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doReco = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-chronic-care-plan-reco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ disease, controlStatus }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("慢病管理计划推荐完成");
      } else {
        message.error("慢病管理计划推荐失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI慢病管理计划推荐</Title>
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
            <Text strong>慢病类型：</Text>
            <Input value={disease} onChange={(e) => setDisease(e.target.value)} style={{ width: 200 }} />
            <Text strong>控制状态：</Text>
            <Select value={controlStatus} onChange={setControlStatus} style={{ width: 160 }}>
              <Select.Option value="控制不佳">控制不佳</Select.Option>
              <Select.Option value="控制一般">控制一般</Select.Option>
              <Select.Option value="控制良好">控制良好</Select.Option>
            </Select>
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doReco}>
              智能推荐
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="推荐结果">
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>推荐管理计划：</Text>
                <Tag color="geekblue" style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.planName}
                </Tag>
              </div>
              <div>
                <Text strong style={{ fontSize: 16 }}>监测频次：</Text>
                <Tag color={freqColor(report.monitorFrequency)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.monitorFrequency}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
