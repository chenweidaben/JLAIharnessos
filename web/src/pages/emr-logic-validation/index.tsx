/**
 * 健澜科技 jlmedaios - 病历逻辑校验前端页（M477-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：三栏输入（诊断/治疗/用药）+ 逻辑错误红色列表 + 校验通过绿色提示。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Col, Layout, List, Row, Spin, Tag, Typography, Input, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

export default function EmrLogicValidationPage() {
  const [diagnosis, setDiagnosis] = useState("高血压");
  const [treatment, setTreatment] = useState("降压治疗");
  const [medication, setMedication] = useState("硝苯地平");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [passed, setPassed] = useState<boolean | null>(null);

  const runCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-logic-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ diagnosis, treatment, medication }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setErrors(data?.result?.errors ?? []);
        setPassed(data?.result?.passed ?? null);
        message.success("逻辑校验完成");
      }
    } catch {
      message.error("请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历逻辑校验</Title>
        <Card title="诊断-治疗-用药" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Text strong>诊断：</Text>
              <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ marginTop: 8 }} />
            </Col>
            <Col span={8}>
              <Text strong>治疗：</Text>
              <Input value={treatment} onChange={(e) => setTreatment(e.target.value)} style={{ marginTop: 8 }} />
            </Col>
            <Col span={8}>
              <Text strong>用药：</Text>
              <Input value={medication} onChange={(e) => setMedication(e.target.value)} style={{ marginTop: 8 }} />
            </Col>
          </Row>
          <Button type="primary" onClick={runCheck} style={{ background: VI.accent, marginTop: 16 }}>
            开始校验
          </Button>
        </Card>
        <Spin spinning={loading}>
          <Card title="逻辑错误列表" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
            {errors.length === 0 ? (
              <Text type="secondary">无逻辑错误</Text>
            ) : (
              <List
                dataSource={errors}
                renderItem={(item: string) => (
                  <List.Item>
                    <Tag color="red">{item}</Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
          {passed !== null && (
            <Card title="校验结论" headStyle={{ background: VI.mid, color: "#fff" }}>
              {passed ? (
                <Tag color="green">√ 逻辑校验通过</Tag>
              ) : (
                <Tag color="red">✗ 存在逻辑错误</Tag>
              )}
            </Card>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
