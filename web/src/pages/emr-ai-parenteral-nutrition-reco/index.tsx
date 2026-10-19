/**
 * 健澜科技 jlmedaios - 病历AI肠外营养配置推荐前端页（M564-D，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI肠外营养配置推荐（病历ID/科室/肠外天数/肝功能异常/推荐氨基酸/推荐脂肪乳）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, InputNumber, Layout, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiParenteralNutritionReco {
  recordId: string;
  dept: string;
}

interface RecoResult {
  aminoAcid: string;
  lipid: string;
}

interface RecoReport {
  aminoAcid: string;
  lipid: string;
}

export default function EmrAiParenteralNutritionRecoPage() {
  const [base, setBase] = useState<AiParenteralNutritionReco | null>(null);
  const [days, setDays] = useState(10);
  const [hasLiverDysfunction, setHasLiverDysfunction] = useState(true);
  const [result, setResult] = useState<RecoResult | null>(null);
  const [report, setReport] = useState<RecoReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-parenteral-nutrition-reco", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 肠外营养配置推荐基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doReco = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-parenteral-nutrition-reco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ days, hasLiverDysfunction }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("肠外营养配置推荐完成");
      } else {
        message.error("肠外营养配置推荐失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI肠外营养配置推荐</Title>
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
            <Text strong>肠外天数：</Text>
            <InputNumber min={1} max={60} value={days} onChange={(v) => setDays(Number(v ?? 0))} />
            <Text strong>肝功能异常：</Text>
            <Switch checked={hasLiverDysfunction} onChange={setHasLiverDysfunction} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doReco}>
              智能推荐
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="推荐结果">
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>推荐氨基酸：</Text>
                <Tag color="geekblue" style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.aminoAcid}
                </Tag>
              </div>
              <div>
                <Text strong style={{ fontSize: 16 }}>推荐脂肪乳：</Text>
                <Tag color={report.lipid === "鱼油脂肪乳" ? "orange" : "blue"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.lipid}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
