/**
 * 健澜科技 jlmedaios - 出院病历质控前端页（M481-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：出院病历检查清单（出院小结/诊断/治疗总结/出院医嘱/随访计划等 checkbox）+ 得分。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Checkbox, Layout, Spin, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const defaultItems = [
  { key: "summary", name: "出院小结", completed: true },
  { key: "diagnosis", name: "出院诊断", completed: true },
  { key: "treatment", name: "治疗总结", completed: true },
  { key: "advice", name: "出院医嘱", completed: true },
  { key: "followup", name: "随访计划", completed: false },
];

export default function EmrDischargeQcPage() {
  const [items, setItems] = useState(defaultItems);
  const [score, setScore] = useState<number | null>(null);
  const [incomplete, setIncomplete] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-discharge-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ items: items.map((i) => ({ name: i.name, completed: i.completed })) }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setScore(data?.score ?? null);
        setIncomplete(data?.result?.incompleteItems ?? []);
      }
    } catch {
      message.error("校验失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>出院病历质控</Title>
        <Spin spinning={loading}>
          <Card title="出院病历检查清单" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
            {items.map((item) => (
              <Checkbox
                key={item.key}
                checked={item.completed}
                onChange={(e) =>
                  setItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, completed: e.target.checked } : i)))
                }
                style={{ display: "block", marginBottom: 12, fontSize: 14 }}
              >
                {item.name}
              </Checkbox>
            ))}
            <Button type="primary" onClick={check} style={{ background: VI.accent, marginTop: 16 }}>
              校验
            </Button>
          </Card>
          {score !== null && (
            <Card title="校验结果" headStyle={{ background: VI.mid, color: "#fff" }}>
              <Text strong>得分：</Text>
              <Text style={{ color: VI.accent, fontSize: 24, marginLeft: 8 }}>{score}</Text>
              {incomplete.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Text strong>未完成项：</Text>
                  {incomplete.map((name) => (
                    <Tag color="red" key={name} style={{ marginLeft: 8 }}>{name}</Tag>
                  ))}
                </div>
              )}
            </Card>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
