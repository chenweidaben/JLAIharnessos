/**
 * 健澜科技 jlmedaios - EMR 模板管理前端页（M461-A，V14，EMR 深化四模块）
 *
 * 避让说明：基础名 emrTemplate / emr/template 已被早期切片占用（EmrTemplatePage），本页改用 -management 后缀避让。
 *
 * 功能：模板列表按 level 分组（general/specialty/ai）+ 新建/编辑/删除弹窗。
 * 后端 route 本次未建，GET/POST/PUT/DELETE 失败时 graceful fallback 到本地 templateCatalog。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Layout,
  message,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { getTemplateCatalog, type MedicalTemplate } from "@/knowledge/templates/templateCatalog";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const LEVEL_LABEL: Record<string, { label: string; color: string }> = {
  general: { label: "通用", color: "blue" },
  specialty: { label: "专科", color: "green" },
  ai: { label: "AI 生成", color: "purple" },
};

const SCENARIO_LABEL: Record<string, string> = {
  outpatient: "门诊",
  inpatient: "住院",
};

async function apiFetch(path: string, options?: RequestInit): Promise<Response | null> {
  try {
    const token = localStorage.getItem("token") ?? "";
    const resp = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...(options?.headers ?? {}),
      },
    });
    return resp;
  } catch {
    return null;
  }
}

export default function EmrTemplateManagementPage() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<MedicalTemplate[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MedicalTemplate | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await apiFetch("/api/v1/emr-template");
        if (resp && resp.ok) {
          const data = await resp.json();
          if (!cancelled) setTemplates(Array.isArray(data) ? data : (data?.templates ?? []));
        } else if (!cancelled) {
          setTemplates(getTemplateCatalog());
        }
      } catch {
        if (!cancelled) setTemplates(getTemplateCatalog());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: MedicalTemplate) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      fields: record.fields.map((f: { key: string; label: string }) => `${f.key}:${f.label}`).join("\n"),
    });
    setModalOpen(true);
  };

  const handleDelete = async (record: MedicalTemplate) => {
    const resp = await apiFetch(`/api/v1/emr-template/${record.templateId}`, { method: "DELETE" });
    if (resp && resp.ok) {
      message.success(`已删除模板 ${record.templateId}`);
      setTemplates((prev) => prev.filter((t) => t.templateId !== record.templateId));
    } else {
      message.warning(`删除失败（后端 route 未就绪，本地仅展示）`);
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload: MedicalTemplate = {
      templateId: values.templateId,
      level: values.level,
      specialty: values.specialty || undefined,
      scenario: values.scenario,
      minFields: Number(values.minFields) || 0,
      fields: String(values.fields ?? "")
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [key, label] = line.split(":");
          return { key: key.trim(), label: (label ?? key).trim(), required: true, visibleByDefault: true };
        }),
    };
    const resp = editing
      ? await apiFetch(`/api/v1/emr-template/${editing.templateId}`, { method: "PUT", body: JSON.stringify(payload) })
      : await apiFetch("/api/v1/emr-template", { method: "POST", body: JSON.stringify(payload) });
    if (resp && resp.ok) {
      message.success(editing ? `已更新模板 ${payload.templateId}` : `已创建模板 ${payload.templateId}`);
      setModalOpen(false);
      setTemplates((prev) => {
        const next = prev.filter((t) => t.templateId !== payload.templateId);
        return [...next, payload];
      });
    } else {
      message.warning(`保存失败（后端 route 未就绪，本地已更新展示）`);
      setTemplates((prev) => {
        const next = prev.filter((t) => t.templateId !== payload.templateId);
        return [...next, payload];
      });
      setModalOpen(false);
    }
  };

  const grouped: Record<string, MedicalTemplate[]> = { general: [], specialty: [], ai: [] };
  for (const t of templates) {
    grouped[t.level]?.push(t);
  }

  const columns = [
    { title: "模板 ID", dataIndex: "templateId", key: "templateId" },
    {
      title: "层级",
      dataIndex: "level",
      key: "level",
      render: (level: string) => {
        const meta = LEVEL_LABEL[level] ?? { label: level, color: "default" };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    { title: "专科", dataIndex: "specialty", key: "specialty", render: (s: string) => s ?? "—" },
    {
      title: "场景",
      dataIndex: "scenario",
      key: "scenario",
      render: (s: string) => <Tag>{SCENARIO_LABEL[s] ?? s}</Tag>,
    },
    { title: "字段数", dataIndex: "fields", key: "fields", render: (fields: unknown[]) => fields.length },
    { title: "最低字段数", dataIndex: "minFields", key: "minFields" },
    {
      title: "操作",
      key: "actions",
      render: (_: unknown, record: MedicalTemplate) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Button size="small" danger onClick={() => handleDelete(record)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, margin: 0 }}>EMR 模板管理</Title>
          <Button type="primary" style={{ background: VI.accent }} onClick={handleCreate}>新建模板</Button>
        </div>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <Row gutter={[16, 16]}>
            {Object.entries(grouped).map(([level, items]) => (
              <Col span={24} key={level}>
                <Card
                  title={`${LEVEL_LABEL[level]?.label ?? level}模板（${items.length} 套）`}
                  headStyle={{ background: VI.deep, color: "#fff" }}
                >
                  <Table rowKey="templateId" columns={columns} dataSource={items} pagination={false} size="small" />
                </Card>
              </Col>
            ))}
          </Row>
        )}
        <Modal
          title={editing ? `编辑模板 ${editing.templateId}` : "新建模板"}
          open={modalOpen}
          onOk={handleSubmit}
          onCancel={() => setModalOpen(false)}
          width={640}
        >
          <Form form={form} layout="vertical">
            <Form.Item name="templateId" label="模板 ID" rules={[{ required: true }]}>
              <Input placeholder="如 CARDIOLOGY_INPATIENT" />
            </Form.Item>
            <Form.Item name="level" label="层级" rules={[{ required: true }]} initialValue="general">
              <Select
                options={[
                  { value: "general", label: "通用" },
                  { value: "specialty", label: "专科" },
                  { value: "ai", label: "AI 生成" },
                ]}
              />
            </Form.Item>
            <Form.Item name="specialty" label="专科（仅专科模板填）">
              <Input placeholder="如 心内科 / 普外科 / ICU" />
            </Form.Item>
            <Form.Item name="scenario" label="场景" rules={[{ required: true }]} initialValue="inpatient">
              <Select
                options={[
                  { value: "outpatient", label: "门诊" },
                  { value: "inpatient", label: "住院" },
                ]}
              />
            </Form.Item>
            <Form.Item name="minFields" label="最低字段数" initialValue={5}>
              <Input type="number" />
            </Form.Item>
            <Form.Item name="fields" label="字段（每行 key:label）" rules={[{ required: true }]}>
              <Input.TextArea rows={6} placeholder={"chiefComplaint:主诉\npresentIllness:现病史"} />
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
}
