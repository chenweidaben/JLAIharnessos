/**
 * 健澜科技 jlmedaios - 质控规则可视化编辑器前端页（M519-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：质控规则可视化编辑器（规则名/分类/严重级别/配置校验/错误列表）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Checkbox, Input, InputNumber, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RuleEditor {
  ruleName: string;
  category: string;
  severity: string;
}

interface RuleConfig {
  name: string;
  threshold: number;
  enabled: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface EditorReport {
  valid: boolean;
  errorCount: number;
}

export default function EmrQcRuleEditorPage() {
  const [editor, setEditor] = useState<RuleEditor | null>(null);
  const [name, setName] = useState("病程记录及时性");
  const [threshold, setThreshold] = useState(24);
  const [enabled, setEnabled] = useState(true);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [report, setReport] = useState<EditorReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEditor = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-rule-editor", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setEditor(data?.data ?? null);
        }
      } catch {
        message.error("加载规则编辑器基础数据失败");
      }
    };
    void fetchEditor();
  }, []);

  const doValidate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-rule-editor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ name, threshold, enabled } as RuleConfig),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("校验完成");
      } else {
        message.error("校验失败");
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
        <Title level={3} style={{ color: VI.deep }}>质控规则可视化编辑器</Title>
        {editor && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="规则编辑器基础数据">
            <div>
              <Text strong>规则名：</Text><Text style={{ marginRight: 24 }}>{editor.ruleName}</Text>
              <Text strong>分类：</Text>
              <Tag color={VI.accent} style={{ marginRight: 24 }}>{editor.category}</Tag>
              <Text strong>严重级别：</Text>
              <Tag color={editor.severity === "block" ? "red" : editor.severity === "major" ? "orange" : "blue"}>{editor.severity}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="规则配置输入">
          <div style={{ marginBottom: 16 }}>
            <Text>规则名</Text>
            <Input value={name} onChange={(e) => setName(e.target.value)} style={{ marginTop: 8, maxWidth: 400 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text>阈值</Text>
            <InputNumber value={threshold} onChange={(v) => setThreshold(Number(v ?? 0))} style={{ marginTop: 8, maxWidth: 200 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Checkbox checked={enabled} onChange={(e) => setEnabled(e.target.checked)}>启用规则</Checkbox>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doValidate}>
            校验配置
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="校验结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong>结果：</Text>
              <Tag color={report.valid ? "green" : "red"} style={{ marginLeft: 8 }}>
                {report.valid ? "通过" : "不通过"}
              </Tag>
              <Text style={{ marginLeft: 16 }}>错误数：{report.errorCount}</Text>
            </div>
            {result.errors.length > 0 && (
              <List
                dataSource={result.errors}
                renderItem={(item) => (
                  <List.Item>
                    <Tag color="red">{item}</Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
