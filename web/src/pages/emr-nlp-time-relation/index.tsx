/**
 * 健澜科技 jlmedaios - 病历 NLP 时间关系提取前端页（M531-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历NLP时间关系提取（病历ID/科室/事件A/事件B/关系类型/天数差）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Select, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface NlpTimeRelation {
  recordId: string;
  dept: string;
}

interface NlpResult {
  relation: string;
  daysDiff: number;
}

interface NlpReport {
  relation: string;
  daysDiff: number;
}

export default function EmrNlpTimeRelationPage() {
  const [nlp, setNlp] = useState<NlpTimeRelation | null>(null);
  const [eventA, setEventA] = useState("入院");
  const [eventB, setEventB] = useState("手术");
  const [relationType, setRelationType] = useState<"之前" | "之后" | "同时">("之前");
  const [result, setResult] = useState<NlpResult | null>(null);
  const [report, setReport] = useState<NlpReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNlp = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-nlp-time-relation", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setNlp(data?.data ?? null);
        }
      } catch {
        message.error("加载时间关系提取基础数据失败");
      }
    };
    void fetchNlp();
  }, []);

  const doExtract = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-nlp-time-relation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ eventA, eventB, relationType }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("提取完成");
      } else {
        message.error("提取失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历NLP时间关系提取</Title>
        {nlp && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{nlp.recordId}</Text>
              <Text strong>科室：</Text><Text>{nlp.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>事件A：</Text>
              <Input value={eventA} onChange={(e) => setEventA(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>事件B：</Text>
              <Input value={eventB} onChange={(e) => setEventB(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>关系类型：</Text>
              <Select
                value={relationType}
                onChange={(v) => setRelationType(v)}
                style={{ width: 120, marginLeft: 8 }}
                options={[
                  { value: "之前", label: "之前" },
                  { value: "之后", label: "之后" },
                  { value: "同时", label: "同时" },
                ]}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doExtract}>
            执行提取
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="提取结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>关系：</Text>
                <Tag color="blue" style={{ marginLeft: 8, fontSize: 16 }}>{report.relation}</Tag>
              </div>
              <Statistic title="天数差" value={report.daysDiff} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
