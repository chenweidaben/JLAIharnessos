/**
 * 健澜科技 jlmedaios - 病历模板可视化编辑器前端页（M465-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：字段列表 + 实时预览面板。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Col, Divider, Input, Layout, message, Row, Switch, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface FieldRow {
  key: string;
  label: string;
  visible: boolean;
}

export default function EmrTemplateEditorPage() {
  const [templateId, setTemplateId] = useState("");
  const [fields, setFields] = useState<FieldRow[]>([
    { key: "chiefComplaint", label: "主诉", visible: true },
    { key: "presentIllness", label: "现病史", visible: true },
  ]);
  const [preview, setPreview] = useState<{ sections: string[]; fieldCount: number } | null>(null);

  const handleAddField = () => {
    setFields([...fields, { key: `field${fields.length + 1}`, label: "", visible: true }]);
  };

  const handleSave = async () => {
    if (!templateId.trim()) {
      message.warning("请输入模板 ID");
      return;
    }
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-editor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          templateId,
          sections: [{ name: "基本信息", fields }],
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setPreview(data?.preview ?? null);
        message.success("模板已保存");
      } else {
        message.warning("保存失败（布局校验未通过或后端 route 未就绪）");
      }
    } catch {
      message.warning("保存失败（后端 route 未就绪）");
    }
  };

  const columns = [
    { title: "字段 Key", dataIndex: "key", key: "key" },
    {
      title: "字段 Label",
      dataIndex: "label",
      key: "label",
      render: (label: string, record: FieldRow) => (
        <Input
          value={label}
          onChange={(e) => {
            const updated = fields.map((f) => f.key === record.key ? { ...f, label: e.target.value } : f);
            setFields(updated);
          }}
          placeholder="字段显示名"
          size="small"
        />
      ),
    },
    {
      title: "可见",
      dataIndex: "visible",
      key: "visible",
      render: (visible: boolean, record: FieldRow) => (
        <Switch
          checked={visible}
          onChange={(checked) => {
            const updated = fields.map((f) => f.key === record.key ? { ...f, visible: checked } : f);
            setFields(updated);
          }}
          size="small"
        />
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历模板可视化编辑器</Title>
        <Card style={{ marginBottom: 16 }}>
          <Input
            placeholder="模板 ID（如 TPL-ADM-001）"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            style={{ width: 300, marginRight: 8 }}
          />
          <Button onClick={handleAddField} style={{ marginRight: 8 }}>添加字段</Button>
          <Button type="primary" style={{ background: VI.accent }} onClick={handleSave}>保存模板</Button>
        </Card>
        <Row gutter={16}>
          <Col span={14}>
            <Card title="字段列表" headStyle={{ background: VI.deep, color: "#fff" }}>
              <Table rowKey="key" columns={columns} dataSource={fields} pagination={false} size="small" />
            </Card>
          </Col>
          <Col span={10}>
            <Card title="实时预览" headStyle={{ background: VI.mid, color: "#fff" }}>
              {preview ? (
                <div>
                  <Text>区域数：{preview.sections.length}</Text>
                  <br />
                  <Text>字段总数：{preview.fieldCount}</Text>
                  <Divider />
                  {preview.sections.map((s) => <Tag key={s} color="blue">{s}</Tag>)}
                </div>
              ) : (
                <Text type="secondary">保存后显示预览</Text>
              )}
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
