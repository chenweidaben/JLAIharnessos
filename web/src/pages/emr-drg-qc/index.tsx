/**
 * 健澜科技 jlmedaios - DRG 病案质控前端页（M480-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：DRG 校验表单（主诊断/并发症/手术操作）+ 校验结果 + 权重计算结果。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Spin, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

export default function EmrDrgQcPage() {
  const [primaryDx, setPrimaryDx] = useState("");
  const [secondaryDx, setSecondaryDx] = useState("");
  const [procedures, setProcedures] = useState("");
  const [baseWeight, setBaseWeight] = useState("1.2");
  const [complicationFactor, setComplicationFactor] = useState("1.5");
  const [compliant, setCompliant] = useState<boolean | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-drg-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({
          primaryDx,
          secondaryDx: secondaryDx ? secondaryDx.split(",").map((s) => s.trim()) : [],
          procedures: procedures ? procedures.split(",").map((s) => s.trim()) : [],
          baseWeight: Number(baseWeight),
          complicationFactor: Number(complicationFactor),
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setCompliant(data?.result?.compliant ?? null);
        setWeight(data?.weight ?? null);
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
        <Title level={3} style={{ color: VI.deep }}>DRG 病案质控</Title>
        <Spin spinning={loading}>
          <Card headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
            <Text strong>主诊断：</Text>
            <Input value={primaryDx} onChange={(e) => setPrimaryDx(e.target.value)} style={{ width: 300, marginTop: 8 }} placeholder="如：冠状动脉粥样硬化性心脏病" />
            <br /><br />
            <Text strong>并发症（逗号分隔）：</Text>
            <Input value={secondaryDx} onChange={(e) => setSecondaryDx(e.target.value)} style={{ width: 300, marginTop: 8 }} placeholder="如：高血压,糖尿病" />
            <br /><br />
            <Text strong>手术操作（逗号分隔）：</Text>
            <Input value={procedures} onChange={(e) => setProcedures(e.target.value)} style={{ width: 300, marginTop: 8 }} placeholder="如：冠状动脉搭桥术" />
            <br /><br />
            <Text strong>基础权重：</Text>
            <Input value={baseWeight} onChange={(e) => setBaseWeight(e.target.value)} style={{ width: 120, marginTop: 8 }} />
            <Text strong style={{ marginLeft: 16 }}>并发症系数：</Text>
            <Input value={complicationFactor} onChange={(e) => setComplicationFactor(e.target.value)} style={{ width: 120, marginTop: 8, marginLeft: 8 }} />
            <br /><br />
            <Button type="primary" onClick={check} style={{ background: VI.accent }}>校验</Button>
          </Card>
          {compliant !== null && (
            <Card title="校验结果" headStyle={{ background: VI.mid, color: "#fff" }}>
              {compliant ? (
                <Tag color="green" style={{ fontSize: 14, padding: 8 }}>√ 合规通过</Tag>
              ) : (
                <Tag color="red" style={{ fontSize: 14, padding: 8 }}>✗ 合规不通过</Tag>
              )}
              {weight !== null && (
                <div style={{ marginTop: 16 }}>
                  <Text strong>DRG 权重：</Text>
                  <Text style={{ color: VI.accent, fontSize: 20, marginLeft: 8 }}>{weight.toFixed(2)}</Text>
                </div>
              )}
            </Card>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
