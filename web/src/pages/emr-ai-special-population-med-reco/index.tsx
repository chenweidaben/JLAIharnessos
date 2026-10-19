/**
 * 健澜科技 jlmedaios - 病历AI特殊人群用药推荐前端页（M565-D，V14，EMR 深化四模块，M565 收官）
 *
 * 深海蓝VI：病历AI特殊人群用药推荐（病历ID/科室/人群类型/药品名称/推荐药品/剂量建议）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Input, Select, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiSpecialPopulationMedReco {
  recordId: string;
  dept: string;
}

interface RecoResult {
  recommendDrug: string;
  dosage: string;
}

interface RecoReport {
  recommendDrug: string;
  dosage: string;
}

export default function EmrAiSpecialPopulationMedRecoPage() {
  const [base, setBase] = useState<AiSpecialPopulationMedReco | null>(null);
  const [population, setPopulation] = useState("妊娠期孕妇");
  const [drugName, setDrugName] = useState("阿莫西林胶囊");
  const [result, setResult] = useState<RecoResult | null>(null);
  const [report, setReport] = useState<RecoReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-special-population-med-reco", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 特殊人群用药推荐基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doReco = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-special-population-med-reco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ population, drugName }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("特殊人群用药推荐完成");
      } else {
        message.error("特殊人群用药推荐失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI特殊人群用药推荐</Title>
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
            <Text strong>人群类型：</Text>
            <Select
              value={population}
              onChange={setPopulation}
              style={{ width: 200 }}
              options={[
                { value: "妊娠期孕妇", label: "妊娠期孕妇" },
                { value: "儿童患者", label: "儿童患者" },
                { value: "老年患者", label: "老年患者" },
              ]}
            />
            <Text strong>药品名称：</Text>
            <Input value={drugName} onChange={(e) => setDrugName(e.target.value)} style={{ width: 200 }} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doReco}>
              智能推荐
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="推荐结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 16 }}>推荐药品：</Text>
              <Tag color="geekblue" style={{ marginLeft: 8, fontSize: 16 }}>
                {report.recommendDrug}
              </Tag>
            </div>
            <div>
              <Text strong style={{ fontSize: 16 }}>剂量建议：</Text>
              <Tag color="orange" style={{ marginLeft: 8, fontSize: 16 }}>
                {report.dosage}
              </Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
