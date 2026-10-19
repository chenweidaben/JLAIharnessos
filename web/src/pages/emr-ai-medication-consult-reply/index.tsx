/**
 * 健澜科技 jlmedaios - 病历AI用药咨询答复前端页（M565-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI用药咨询答复（病历ID/科室/咨询问题/药品名称/AI答复/安全警告）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Input, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiMedicationConsultReply {
  recordId: string;
  dept: string;
}

interface ReplyResult {
  reply: string;
  warning: string;
}

interface ReplyReport {
  reply: string;
  warning: string;
}

export default function EmrAiMedicationConsultReplyPage() {
  const [base, setBase] = useState<AiMedicationConsultReply | null>(null);
  const [question, setQuestion] = useState("这个药需要饭前吃吗？");
  const [drugName, setDrugName] = useState("奥美拉唑肠溶胶囊");
  const [result, setResult] = useState<ReplyResult | null>(null);
  const [report, setReport] = useState<ReplyReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-medication-consult-reply", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 用药咨询答复基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doReply = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-medication-consult-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ question, drugName }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("用药咨询答复完成");
      } else {
        message.error("用药咨询答复失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI用药咨询答复</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="咨询输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>咨询问题：</Text>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} style={{ width: 280 }} />
            <Text strong>药品名称：</Text>
            <Input value={drugName} onChange={(e) => setDrugName(e.target.value)} style={{ width: 200 }} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doReply}>
              AI 答复
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="答复结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 16 }}>AI答复：</Text>
              <Tag color="geekblue" style={{ marginLeft: 8, fontSize: 16 }}>
                {report.reply}
              </Tag>
            </div>
            <div>
              <Text strong style={{ fontSize: 16 }}>安全警告：</Text>
              <Tag color={report.warning === "无特殊警告" ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                {report.warning}
              </Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
