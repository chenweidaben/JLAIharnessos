/**
 * 健澜科技 jlmedaios - 病历打印版式与套打前端页（M466-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：版式预览（A4 纸框+字段位置）+ 套打测试按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, message, Space, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

export default function EmrPrintLayoutPage() {
  const [templateId] = useState("TPL-ADM-001");
  const [renderedCount, setRenderedCount] = useState<number | null>(null);

  const handleTestPrint = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-print-layout/render", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          templateId,
          data: { patientName: "张三", admissionDate: "2026-10-18", diagnosis: "社区获得性肺炎" },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setRenderedCount(data?.rendered?.length ?? 0);
        message.success("套打渲染成功");
      } else {
        message.warning("渲染失败（后端 route 未就绪）");
      }
    } catch {
      message.warning("渲染失败（后端 route 未就绪）");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历打印版式与套打</Title>
        <Card title="版式预览（A4 纵向）" headStyle={{ background: VI.deep, color: "#fff" }}>
          <Space direction="vertical">
            <Tag color="blue">纸张：A4</Tag>
            <Tag color="blue">方向：纵向（portrait）</Tag>
            <Tag color="blue">边距：20mm</Tag>
            <Text>字段坐标：patientName(30,40) / admissionDate(30,70) / diagnosis(30,100)</Text>
          </Space>
        </Card>
        <Card style={{ marginTop: 16 }}>
          <Button type="primary" style={{ background: VI.accent }} onClick={handleTestPrint}>套打测试渲染</Button>
          {renderedCount !== null && (
            <Text style={{ marginLeft: 16 }}>已渲染字段数：{renderedCount}</Text>
          )}
        </Card>
      </Content>
    </Layout>
  );
}
