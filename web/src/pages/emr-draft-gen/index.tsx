/**
 * 健澜科技 jlmedaios - 病历 AI 草稿生成前端页（M462-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：输入表单（主诉/现病史/查体/诊断）+ 生成按钮 + 草稿预览区。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Col, Form, Input, Layout, message, Row, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

export default function EmrDraftGenPage() {
  const [form] = Form.useForm();
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-draft-gen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ type: "admission", ...values }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setDraft(data?.draft ?? "");
        message.success("草稿生成成功");
      } else {
        message.warning("生成失败（后端 route 未就绪）");
      }
    } catch {
      // graceful
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历 AI 草稿生成</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Card title="输入" headStyle={{ background: VI.deep, color: "#fff" }}>
              <Form form={form} layout="vertical">
                <Form.Item name="chiefComplaint" label="主诉" rules={[{ required: true }]}>
                  <TextArea rows={2} placeholder="如：咳嗽3天，发热1天" />
                </Form.Item>
                <Form.Item name="presentIllness" label="现病史" rules={[{ required: true }]}>
                  <TextArea rows={4} placeholder="如：患者3天前无明显诱因出现咳嗽..." />
                </Form.Item>
                <Form.Item name="physicalExam" label="体格检查" rules={[{ required: true }]}>
                  <TextArea rows={3} placeholder="如：双肺呼吸音粗，闻及湿啰音" />
                </Form.Item>
                <Form.Item name="diagnosis" label="初步诊断" rules={[{ required: true }]}>
                  <TextArea rows={2} placeholder="如：社区获得性肺炎" />
                </Form.Item>
                <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={handleGenerate}>
                  生成草稿
                </Button>
              </Form>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="草稿预览" headStyle={{ background: VI.mid, color: "#fff" }}>
              <pre style={{ whiteSpace: "pre-wrap", minHeight: 300, fontSize: 14 }}>{draft || "点击「生成草稿」查看结果"}</pre>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
