/**
 * 健澜科技 jlmedaios - 病历AI术后镇痛方案推荐前端页（M562-D，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI术后镇痛方案推荐（病历ID/科室/手术类型/疼痛评分/推荐镇痛方案/剂量建议）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, InputNumber, Layout, Slider, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiPostopAnalgesiaReco {
  recordId: string;
  dept: string;
}

interface RecoResult {
  planName: string;
  dosage: string;
}

interface RecoReport {
  planName: string;
  dosage: string;
}

export default function EmrAiPostopAnalgesiaRecoPage() {
  const [base, setBase] = useState<AiPostopAnalgesiaReco | null>(null);
  const [surgeryType, setSurgeryType] = useState("心脏搭桥手术");
  const [painScore, setPainScore] = useState(5);
  const [result, setResult] = useState<RecoResult | null>(null);
  const [report, setReport] = useState<RecoReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-postop-analgesia-reco", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 术后镇痛方案推荐基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doReco = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-postop-analgesia-reco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ surgeryType, painScore }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("术后镇痛方案推荐完成");
      } else {
        message.error("术后镇痛方案推荐失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI术后镇痛方案推荐</Title>
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
            <Text strong>手术类型：</Text>
            <Input value={surgeryType} onChange={(e) => setSurgeryType(e.target.value)} style={{ width: 200 }} />
            <Text strong>疼痛评分：</Text>
            <Slider style={{ width: 200 }} min={0} max={10} value={painScore} onChange={setPainScore} />
            <InputNumber min={0} max={10} value={painScore} onChange={(v) => setPainScore(Number(v ?? 0))} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doReco}>
              智能推荐
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="推荐结果">
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>推荐镇痛方案：</Text>
                <Tag color="geekblue" style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.planName}
                </Tag>
              </div>
              <div>
                <Text strong style={{ fontSize: 16 }}>剂量建议：</Text>
                <Tag color={report.dosage === "根据体重调整" ? "orange" : "green"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.dosage}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
