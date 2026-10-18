/**
 * 健澜科技 jlmedaios - NLP 病历关系抽取前端页（M490-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历正文 TextArea + 关系标注结果（治疗蓝/导致红/禁忌橙 Tag）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface NlpRelationResult {
  relations: string[];
}

interface NlpRelationReport {
  relationCount: number;
}

const relationTagColor = (relation: string): string => {
  if (relation === "治疗") return "blue";
  if (relation === "导致") return "red";
  if (relation === "禁忌") return "orange";
  return "default";
};

export default function EmrNlpRelationPage() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<NlpRelationResult | null>(null);
  const [report, setReport] = useState<NlpRelationReport | null>(null);

  const extract = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-nlp-relation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ content }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("关系抽取完成");
      }
    } catch {
      message.error("关系抽取失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>NLP 病历关系抽取</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="病历正文">
          <TextArea
            rows={6}
            placeholder="请输入病历正文（如：胰岛素治疗糖尿病，并发症导致高血糖）"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" onClick={extract} style={{ background: VI.accent }}>
            抽取关系
          </Button>
        </Card>
        {result && (
          <Card style={{ marginTop: 16 }}>
            <Text strong>识别结果（共 {report?.relationCount ?? 0} 个关系）：</Text>
            <br />
            {result.relations.map((r) => (
              <Tag key={r} color={relationTagColor(r)} style={{ marginBottom: 8 }}>
                {r}
              </Tag>
            ))}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
