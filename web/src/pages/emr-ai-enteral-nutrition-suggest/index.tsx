/**
 * 健澜科技 jlmedaios - 病历AI肠内营养支持建议前端页（M564-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI肠内营养支持建议（病历ID/科室/吞咽功能/肠道功能/推荐制剂/输注途径）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Select, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiEnteralNutritionSuggest {
  recordId: string;
  dept: string;
}

interface SuggestResult {
  formula: string;
  deliveryRoute: string;
}

interface SuggestReport {
  formula: string;
  deliveryRoute: string;
}

export default function EmrAiEnteralNutritionSuggestPage() {
  const [base, setBase] = useState<AiEnteralNutritionSuggest | null>(null);
  const [swallowing, setSwallowing] = useState("困难");
  const [gutFunction, setGutFunction] = useState("正常");
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [report, setReport] = useState<SuggestReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-enteral-nutrition-suggest", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 肠内营养支持建议基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doSuggest = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-enteral-nutrition-suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ swallowing, gutFunction }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("肠内营养支持建议完成");
      } else {
        message.error("肠内营养支持建议失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI肠内营养支持建议</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="建议输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>吞咽功能：</Text>
            <Select value={swallowing} onChange={setSwallowing} style={{ width: 160 }}>
              <Select.Option value="困难">困难</Select.Option>
              <Select.Option value="正常">正常</Select.Option>
            </Select>
            <Text strong>肠道功能：</Text>
            <Select value={gutFunction} onChange={setGutFunction} style={{ width: 160 }}>
              <Select.Option value="正常">正常</Select.Option>
              <Select.Option value="异常">异常</Select.Option>
            </Select>
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doSuggest}>
              生成建议
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="建议结果">
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>推荐制剂：</Text>
                <Tag color="geekblue" style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.formula}
                </Tag>
              </div>
              <div>
                <Text strong style={{ fontSize: 16 }}>输注途径：</Text>
                <Tag color={report.deliveryRoute === "鼻胃管" ? "red" : "green"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.deliveryRoute}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
