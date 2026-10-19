/**
 * 健澜科技 jlmedaios - 病历AI康复评估推荐前端页（M563-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI康复评估推荐（病历ID/科室/诊断/活动能力/推荐评估项目/康复等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Input, Select, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiRehabAssessReco {
  recordId: string;
  dept: string;
}

interface RecoResult {
  assessItems: string[];
  rehabLevel: string;
}

interface RecoReport {
  assessItems: string[];
  rehabLevel: string;
}

function levelColor(l: string): string {
  if (l === "重度") return "red";
  if (l === "中度") return "orange";
  return "green";
}

export default function EmrAiRehabAssessRecoPage() {
  const [base, setBase] = useState<AiRehabAssessReco | null>(null);
  const [diagnosis, setDiagnosis] = useState("脑卒中后偏瘫");
  const [mobility, setMobility] = useState("卧床");
  const [result, setResult] = useState<RecoResult | null>(null);
  const [report, setReport] = useState<RecoReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-rehab-assess-reco", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 康复评估推荐基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doReco = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-rehab-assess-reco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diagnosis, mobility }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("康复评估推荐完成");
      } else {
        message.error("康复评估推荐失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI康复评估推荐</Title>
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
            <Text strong>诊断：</Text>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 200 }} />
            <Text strong>活动能力：</Text>
            <Select value={mobility} onChange={setMobility} style={{ width: 160 }}>
              <Select.Option value="卧床">卧床</Select.Option>
              <Select.Option value="辅助行走">辅助行走</Select.Option>
              <Select.Option value="自主行走">自主行走</Select.Option>
            </Select>
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doReco}>
              智能推荐
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="推荐结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 16 }}>推荐评估项目：</Text>
              <div style={{ marginTop: 8 }}>
                {report.assessItems.map((item) => (
                  <Tag key={item} color="geekblue" style={{ marginBottom: 8, fontSize: 14 }}>
                    {item}
                  </Tag>
                ))}
              </div>
            </div>
            <div>
              <Text strong style={{ fontSize: 16 }}>康复等级：</Text>
              <Tag color={levelColor(report.rehabLevel)} style={{ marginLeft: 8, fontSize: 16 }}>
                {report.rehabLevel}
              </Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
