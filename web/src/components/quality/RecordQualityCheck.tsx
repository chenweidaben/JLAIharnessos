/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 病历质控：在线批阅 + 缺陷标记 + AI辅助 + 评分 + 电子签名提交
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  List,
  Modal,
  Popover,
  Radio,
  Select,
  Space,
  Steps,
  Tag,
  Timeline,
  message,
} from 'antd';
import {
  HighlightOutlined,
  CheckCircleOutlined,
  DislikeOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import type { DefectLevel, DefectType, QualityDefect, RecordSection } from '@/types/quality';
import { DEFECT_LEVEL_LABEL, DEFECT_TYPE_LABEL } from '@/types/quality';
import { useQualityStore } from '@/store/qualityStore';

const LEVEL_COLOR: Record<DefectLevel, string> = {
  minor: 'default',
  major: 'warning',
  critical: 'error',
};
const TYPE_COLOR: Record<DefectType, string> = {
  integrity: 'blue',
  standardization: 'cyan',
  logic: 'purple',
  timeliness: 'orange',
};

const LEVEL_DEDUCT: Record<DefectLevel, number> = { minor: 2, major: 5, critical: 10 };

/** 高亮病历中缺陷锚点文本 */
function renderHighlighted(content: string, defects: QualityDefect[]) {
  const anchors = defects.map((d) => d.location.anchor).filter(Boolean);
  if (anchors.length === 0) return content;
  // 依次切分高亮
  let nodes: React.ReactNode[] = [content];
  anchors.forEach((anchor, idx) => {
    const next: React.ReactNode[] = [];
    nodes.forEach((n) => {
      if (typeof n !== 'string') {
        next.push(n);
        return;
      }
      const parts = n.split(anchor);
      parts.forEach((p, i) => {
        next.push(p);
        if (i < parts.length - 1) {
          next.push(
            <mark
              key={`${idx}-${i}`}
              className="rounded bg-yellow-200 px-0.5 text-inherit"
              title={`缺陷 #${idx + 1}`}
            >
              {anchor}
            </mark>,
          );
        }
      });
    });
    nodes = next;
  });
  return nodes;
}

export default function RecordQualityCheck() {
  const { recordId = '' } = useParams();
  const navigate = useNavigate();
  const {
    currentRecord,
    qualityResult,
    loading,
    fetchRecordDetail,
    saveQualityResult,
    submitQualityResult,
    acceptAIDefect,
    addDefect,
    removeDefect,
  } = useQualityStore();

  const [activeSection, setActiveSection] = useState('s1');
  const [selectedText, setSelectedText] = useState('');
  const [markDrawer, setMarkDrawer] = useState(false);
  const [signModal, setSignModal] = useState(false);
  const [signature, setSignature] = useState('');
  const [opinionForm] = Form.useForm();

  useEffect(() => {
    void fetchRecordDetail(recordId);
  }, [recordId, fetchRecordDetail]);

  const task = currentRecord?.task;
  const sections = currentRecord?.sections ?? [];
  const aiDefects = currentRecord?.aiDefects ?? [];
  const defects = qualityResult?.defects ?? [];
  const vetoItems = qualityResult?.vetoItems ?? [];

  const activeSec: RecordSection | undefined = sections.find((s) => s.id === activeSection);

  // 文本选择标记缺陷
  const handleSelect = () => {
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.length > 1) {
      setSelectedText(sel);
      setMarkDrawer(true);
    }
  };

  const handleAddManualDefect = async (values: {
    type: DefectType;
    level: DefectLevel;
    description: string;
    suggestion: string;
  }) => {
    const defect: QualityDefect = {
      defectId: `MANUAL-${Date.now()}`,
      ruleCode: `RULE-MANUAL`,
      type: values.type,
      level: values.level,
      description: values.description,
      deduction: LEVEL_DEDUCT[values.level],
      location: {
        section: activeSec?.title ?? '',
        anchor: selectedText,
        startOffset: 0,
        endOffset: selectedText.length,
      },
      suggestion: values.suggestion,
      aiSuggested: false,
      aiAction: 'adopted',
    };
    await addDefect(defect);
    setMarkDrawer(false);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
    message.success('已标记缺陷并自动扣分');
  };

  const handleSubmit = async () => {
    if (!qualityResult) return;
    if (!signature.trim()) {
      message.warning('请输入电子签名');
      return;
    }
    const opinion = opinionForm.getFieldsValue();
    const finalResult: typeof qualityResult = {
      ...qualityResult,
      overallComment: opinion.overallComment ?? qualityResult.overallComment,
      strengths: opinion.strengths ?? qualityResult.strengths,
      weaknesses: opinion.weaknesses ?? qualityResult.weaknesses,
      rectifyRequirement: opinion.rectifyRequirement ?? qualityResult.rectifyRequirement,
      qualityDoctor: signature,
    };
    await saveQualityResult(finalResult);
    await submitQualityResult(finalResult);
    setSignModal(false);
    message.success('质控结果已提交并电子签名');
    navigate('/quality');
  };

  const gradeColor =
    qualityResult?.grade === 'A' ? 'success' : qualityResult?.grade === 'B' ? 'warning' : 'error';
  const gradeText =
    qualityResult?.grade === 'A' ? '甲级' : qualityResult?.grade === 'B' ? '乙级' : '丙级';

  const defectStats = useMemo(() => {
    return {
      total: defects.length,
      minor: defects.filter((d) => d.level === 'minor').length,
      major: defects.filter((d) => d.level === 'major').length,
      critical: defects.filter((d) => d.level === 'critical').length,
    };
  }, [defects]);

  if (loading && !currentRecord) {
    return <div className="p-10 text-center text-ink-secondary">加载病历中...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-140px)] gap-3">
      {/* 左侧：病历目录 */}
      <Card
        size="small"
        title="病历目录"
        className="w-56 shrink-0 overflow-auto"
        styles={{ body: { padding: 8 } }}
      >
        <List
          size="small"
          dataSource={sections}
          renderItem={(s) => (
            <List.Item
              className={`cursor-pointer rounded px-2 ${activeSection === s.id ? 'bg-jl-primary/10' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              <Space size={6}>
                <FileTextOutlined className="text-jl-primary" />
                <div>
                  <div className="text-xs">{s.title}</div>
                  <div className="text-[10px] text-ink-secondary">
                    {s.editor} · {s.updatedAt.slice(5, 16)}
                  </div>
                </div>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      {/* 中间：病历内容 */}
      <Card
        size="small"
        className="flex-1 overflow-auto"
        title={
          <Space>
            <span>{activeSec?.title}</span>
            <Tag>{task?.dept}</Tag>
            <Tag color="blue">{task?.recordType}</Tag>
          </Space>
        }
        extra={
          <span className="text-xs text-ink-secondary">
            书写：{activeSec?.editor} · {activeSec?.updatedAt}
          </span>
        }
      >
        <Alert
          message="提示：用鼠标选中病历文本即可标记缺陷；黄色高亮为已标记问题位置。"
          type="info"
          showIcon
          className="mb-3"
        />
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- 病历文本选区：用户用鼠标/触摸选中文本标记缺陷，文本选择无键盘等价交互 */}
        <div
          className="min-h-[420px] rounded bg-white p-4 leading-8 text-ink-primary shadow-inner"
          onMouseUp={handleSelect}
          style={{ fontFamily: '"FangSong", "SimSun", serif', fontSize: 15 }}
        >
          {activeSec && renderHighlighted(activeSec.content, defects)}
        </div>

        {/* AI 辅助缺陷 */}
        {aiDefects.some((d) => d.aiAction === 'pending') && (
          <Card
            size="small"
            className="mt-3"
            title={
              <Space>
                <HighlightOutlined className="text-jl-primary" />
                AI 辅助质控建议
              </Space>
            }
          >
            <Timeline
              items={aiDefects
                .filter((d) => d.aiAction === 'pending')
                .map((d) => ({
                  color: d.level === 'critical' ? 'red' : d.level === 'major' ? 'orange' : 'blue',
                  children: (
                    <div>
                      <Space size={4} wrap>
                        <Tag color={TYPE_COLOR[d.type]}>{DEFECT_TYPE_LABEL[d.type]}</Tag>
                        <Tag color={LEVEL_COLOR[d.level]}>{DEFECT_LEVEL_LABEL[d.level]}</Tag>
                        <span className="text-xs text-ink-secondary">
                          位于「{d.location.section}」
                        </span>
                      </Space>
                      <p className="mt-1 mb-1 text-sm">{d.description}</p>
                      <p className="mb-2 text-xs text-ink-secondary">建议：{d.suggestion}</p>
                      <Space>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => void acceptAIDefect(d.defectId, 'adopted')}
                        >
                          采纳
                        </Button>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => void acceptAIDefect(d.defectId, 'modified')}
                        >
                          修改后采纳
                        </Button>
                        <Button
                          size="small"
                          icon={<DislikeOutlined />}
                          onClick={() => void acceptAIDefect(d.defectId, 'ignored')}
                        >
                          忽略
                        </Button>
                      </Space>
                    </div>
                  ),
                }))}
            />
          </Card>
        )}
      </Card>

      {/* 右侧：质控面板 */}
      <div className="flex w-96 shrink-0 flex-col gap-3 overflow-auto">
        {/* 评分卡片 */}
        <Card size="small" className="shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-ink-secondary">质控评分</div>
              <div className="text-3xl font-semibold text-jl-primary">
                {qualityResult?.score ?? 100}
              </div>
            </div>
            <div className="text-right">
              <Tag color={gradeColor} className="text-sm">
                {gradeText}
              </Tag>
              <div className="mt-1 text-xs text-ink-secondary">甲≥90 / 乙75-89 / 丙&lt;75</div>
            </div>
          </div>
          <div className="mt-2 flex gap-2 text-xs">
            <Tag>一般 {defectStats.minor}</Tag>
            <Tag color="warning">重要 {defectStats.major}</Tag>
            <Tag color="error">严重 {defectStats.critical}</Tag>
            <Tag color="purple">合计 {defectStats.total}</Tag>
          </div>
          {vetoItems.length > 0 && (
            <Alert
              className="mt-2"
              type="error"
              showIcon
              message={`单项否决：${vetoItems.join('；')}（直接评定丙级）`}
            />
          )}
        </Card>

        {/* 缺陷列表 */}
        <Card size="small" title={`缺陷列表（${defects.length}）`} className="shadow-card">
          {defects.length === 0 ? (
            <div className="py-6 text-center text-xs text-ink-secondary">
              暂无缺陷，可选中病历文本进行标记
            </div>
          ) : (
            <List
              size="small"
              dataSource={defects}
              renderItem={(d) => (
                <List.Item
                  actions={[
                    <Popover
                      key="view"
                      content={`定位：${d.location.section}「${d.location.anchor}」`}
                    >
                      <EyeOutlined className="text-jl-primary" />
                    </Popover>,
                    <DislikeOutlined
                      key="del"
                      className="text-danger"
                      onClick={() => void removeDefect(d.defectId)}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space size={4}>
                        <Tag color={TYPE_COLOR[d.type]}>{DEFECT_TYPE_LABEL[d.type]}</Tag>
                        <Tag color={LEVEL_COLOR[d.level]}>-{d.deduction}分</Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <div className="text-xs">{d.description}</div>
                        <div className="mt-0.5 text-[10px] text-ink-secondary">{d.suggestion}</div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* 质控意见 */}
        <Card size="small" title="质控意见" className="shadow-card">
          <Form form={opinionForm} layout="vertical" size="small">
            <Form.Item name="overallComment" label="总体评价">
              <Input.TextArea rows={2} placeholder="对病历的总体评价" />
            </Form.Item>
            <Form.Item name="strengths" label="优点">
              <Input.TextArea rows={1} />
            </Form.Item>
            <Form.Item name="weaknesses" label="缺点">
              <Input.TextArea rows={1} />
            </Form.Item>
            <Form.Item name="rectifyRequirement" label="整改要求">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
          <Button type="dashed" block onClick={() => void saveQualityResult(qualityResult!)}>
            暂存质控意见
          </Button>
          <Button
            type="primary"
            block
            icon={<SendOutlined />}
            className="mt-2"
            onClick={() => setSignModal(true)}
          >
            提交质控结果（电子签名）
          </Button>
        </Card>
      </div>

      {/* 标记缺陷抽屉 */}
      <Drawer
        open={markDrawer}
        onClose={() => setMarkDrawer(false)}
        width={420}
        title={
          <Space>
            <HighlightOutlined /> 标记缺陷
          </Space>
        }
      >
        <Alert className="mb-3" type="info" showIcon message={`已选中文本：“${selectedText}”`} />
        <Form layout="vertical" onFinish={handleAddManualDefect}>
          <Form.Item
            name="type"
            label="缺陷类型"
            initialValue="integrity"
            rules={[{ required: true }]}
          >
            <Select
              options={(Object.keys(DEFECT_TYPE_LABEL) as DefectType[]).map((k) => ({
                label: DEFECT_TYPE_LABEL[k],
                value: k,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="level"
            label="缺陷等级"
            initialValue="minor"
            rules={[{ required: true }]}
          >
            <Radio.Group>
              {(Object.keys(DEFECT_LEVEL_LABEL) as DefectLevel[]).map((k) => (
                <Radio.Button key={k} value={k}>
                  {DEFECT_LEVEL_LABEL[k]}（-{LEVEL_DEDUCT[k]}分）
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>
          <Form.Item name="description" label="缺陷描述" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="描述该处存在的问题" />
          </Form.Item>
          <Form.Item name="suggestion" label="整改建议">
            <Input.TextArea rows={2} placeholder="给临床医生的整改建议" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              <CheckCircleOutlined /> 确认标记
            </Button>
            <Button onClick={() => setMarkDrawer(false)}>取消</Button>
          </Space>
        </Form>
      </Drawer>

      {/* 电子签名弹窗 */}
      <Modal
        open={signModal}
        title="电子签名提交质控结果"
        onOk={handleSubmit}
        onCancel={() => setSignModal(false)}
        okText="确认签名提交"
      >
        <Descriptions size="small" column={1} className="mb-3">
          <Descriptions.Item label="病历号">{task?.recordNo}</Descriptions.Item>
          <Descriptions.Item label="最终评分">
            {qualityResult?.score} 分（{gradeText}）
          </Descriptions.Item>
          <Descriptions.Item label="缺陷数">{defects.length} 项</Descriptions.Item>
        </Descriptions>
        <Steps
          size="small"
          current={1}
          items={[{ title: '缺陷标记' }, { title: '电子签名' }, { title: '提交归档' }]}
          className="mb-3"
        />
        <Input.Password
          placeholder="请输入质控医生电子签名（工号/密码）"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
        />
        <p className="mt-2 text-xs text-ink-secondary">
          提交后质控结果将归档并通知主管医生整改，不可修改。
        </p>
      </Modal>
    </div>
  );
}
