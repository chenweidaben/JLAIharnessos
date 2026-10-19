/**
 * 健澜科技 jlmedaios - 病历AI膳食处方推荐前端页（M564-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI膳食处方推荐（病历ID/科室/疾病类型/热量需求/推荐膳食类型/营养配比）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, InputNumber, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiDietScriptReco {
  recordId: string;
  dept: string;
}

interface RecoResult {
  dietType: string;
  nutritionRatio: string;
}

interface RecoReport {
  dietType: string;
  nutritionRatio: string;
}

function ratioColor(r: string): string {
  if (r === "高蛋白高热量") return "red";
  return "blue";
}

export default function EmrAiDietScriptRecoPage() {
  const [base, setBase] = useState<AiDietScriptReco | null>(null);
  const [disease, setDisease] = useState("2型糖尿病");
  const [calorieNeeds, setCalorieNeeds] = useState(1800);
  const [result, setResult] = useState<RecoResult | null>(null);
  const [report, setReport] = useState<RecoReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-diet-script-reco", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 膳食处方推荐基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doReco = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-diet-script-reco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ disease, calorieNeeds }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("膳食处方推荐完成");
      } else {
        message.error("膳食处方推荐失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI膳食处方推荐</Title>
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
            <Text strong>疾病类型：</Text>
            <Input value={disease} onChange={(e) => setDisease(e.target.value)} style={{ width: 200 }} />
            <Text strong>热量需求(kcal)：</Text>
            <InputNumber min={800} max={4000} step={100} value={calorieNeeds} onChange={(v) => setCalorieNeeds(Number(v ?? 0))} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doReco}>
              智能推荐
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="推荐结果">
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>推荐膳食类型：</Text>
                <Tag color="geekblue" style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.dietType}
                </Tag>
              </div>
              <div>
                <Text strong style={{ fontSize: 16 }}>营养配比：</Text>
                <Tag color={ratioColor(report.nutritionRatio)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.nutritionRatio}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
