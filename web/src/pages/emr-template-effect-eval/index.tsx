/**
 * 健澜科技 jlmedaios - 模板效果评估前端页（M525-D，V14，EMR 深化四模块，M525 收官）
 *
 * 深海蓝VI：模板效果评估（模板名/评估周期/完成率/满意度/缺陷降低率/效果分/等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface EffectEval {
  templateName: string;
  evalPeriod: string;
}

interface EvalResult {
  effectScore: number;
  grade: string;
}

interface EvalReport {
  effectScore: number;
  grade: string;
}

const DEFAULT_INPUT = {
  completionRate: 95,
  satisfactionRate: 92,
  defectReduction: 90,
};

export default function EmrTemplateEffectEvalPage() {
  const [evalData, setEvalData] = useState<EffectEval | null>(null);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [report, setReport] = useState<EvalReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEval = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-effect-eval", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setEvalData(data?.data ?? null);
        }
      } catch {
        message.error("加载效果评估基础数据失败");
      }
    };
    void fetchEval();
  }, []);

  const doEval = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-effect-eval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(DEFAULT_INPUT),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("评估完成");
      } else {
        message.error("评估失败");
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
        <Title level={3} style={{ color: VI.deep }}>模板效果评估</Title>
        {evalData && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="评估基础数据">
            <div>
              <Text strong>模板名：</Text><Text style={{ marginRight: 24 }}>{evalData.templateName}</Text>
              <Text strong>评估周期：</Text><Text>{evalData.evalPeriod}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="评估输入">
          <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
            <Text>完成率：<Tag color="green">{DEFAULT_INPUT.completionRate}%</Tag></Text>
            <Text>满意度：<Tag color="blue">{DEFAULT_INPUT.satisfactionRate}%</Tag></Text>
            <Text>缺陷降低率：<Tag color="orange">{DEFAULT_INPUT.defectReduction}%</Tag></Text>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doEval}>
            效果评估
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="评估结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="效果分" value={report.effectScore} precision={1} />
              <div>
                <Text strong>等级：</Text>
                <Tag
                  color={report.grade === "卓越" ? "green" : report.grade === "良好" ? "blue" : report.grade === "合格" ? "orange" : "red"}
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {report.grade}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
