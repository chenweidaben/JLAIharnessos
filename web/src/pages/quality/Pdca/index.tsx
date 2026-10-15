/**
 * 健澜科技数智医院智能体 — 【质量与合规】PDCA 持续改进工作台
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 路径：/quality/pdca
 * 依据《医疗质量管理办法》第十八条、三级医院评审第四章：
 *   Plan（问题分析+目标+措施）→ Do（实施记录）→ Check（前后数据对比）
 *   → Act（标准化+遗留问题转下一循环）
 * 深海蓝 VI：主色 #0A4D8C，深色 #073A6B，浅蓝 #E8F1FA。
 */
import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Statistic,
  Steps,
  Table,
  Tag,
  message,
} from 'antd';
import {
  AimOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  PlayCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

type Phase = 'Plan' | 'Do' | 'Check' | 'Act';

interface PdcaProject {
  id: string;
  name: string;
  dept: string;
  leader: string;
  phase: Phase;
  target: {
    metric: string;
    unit: string;
    direction: 'lower_better' | 'higher_better';
    baseline: number;
    goal: number;
  };
  closed: boolean;
}

const PHASE_META: { key: Phase; title: string; desc: string; icon: JSX.Element }[] = [
  { key: 'Plan', title: 'Plan 计划', desc: '问题分析·目标设定·措施计划', icon: <AimOutlined /> },
  { key: 'Do', title: 'Do 执行', desc: '措施实施·过程记录', icon: <PlayCircleOutlined /> },
  { key: 'Check', title: 'Check 检查', desc: '前后数据对比·效果评估', icon: <ExperimentOutlined /> },
  { key: 'Act', title: 'Act 处理', desc: '标准化·遗留问题转下一循环', icon: <SafetyCertificateOutlined /> },
];

const DEEP = '#0A4D8C';
const DEEP_DARK = '#073A6B';
const DEEP_BG = '#E8F1FA';

export default function PdcaWorkbench() {
  const [form] = Form.useForm();
  const [project, setProject] = useState<PdcaProject | null>(null);
  const [before, setBefore] = useState({ sampleSize: 120, rate: 4.2 });
  const [after, setAfter] = useState({ sampleSize: 130, rate: 1.8 });
  const [effect, setEffect] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const currentStep = useMemo(() => {
    if (!project) return 0;
    return PHASE_META.findIndex((p) => p.key === project.phase);
  }, [project]);

  async function callApi(payload: Record<string, unknown>) {
    setLoading(true);
    try {
      const resp = await fetch('/api/v1/quality/pdca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (json.code !== 0) throw new Error(json.message || '请求失败');
      return json.data;
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    const v = await form.validateFields();
    const data = await callApi({
      action: 'create',
      name: v.name,
      dept: v.dept,
      leader: v.leader,
      target: {
        metric: v.metric,
        unit: v.unit || '%',
        direction: v.direction,
        baseline: v.baseline,
        goal: v.goal,
      },
    });
    setProject(data as PdcaProject);
    setEffect(null);
    message.success('PDCA 项目已创建（Plan 阶段）');
  }

  async function handleAdvance(next: Phase) {
    if (!project) return;
    try {
      const data = await callApi({ action: 'advance', project, nextPhase: next });
      setProject(data as PdcaProject);
      message.success(`已推进到 ${next}`);
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  async function handleEffect() {
    if (!project) return;
    // 本地把 before/after 塞进 project 后调纯函数 effect
    const enriched = {
      ...project,
      check: { before, after },
    };
    try {
      const data = await callApi({ action: 'effect', project: enriched });
      setEffect(data as Record<string, unknown>);
      message.success('效果计算完成');
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  return (
    <div className="animate-fade-in" style={{ padding: 16, background: '#F5F7FA', minHeight: '100%' }}>
      {/* 深海蓝头部横幅 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${DEEP_DARK} 0%, ${DEEP} 100%)`,
          borderRadius: 12,
          padding: '20px 24px',
          color: '#fff',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          <SafetyCertificateOutlined style={{ marginRight: 8 }} />
          医院质量管理 PDCA 持续改进工作台
        </div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
          真改进，不是填表 —— Plan/Do/Check/Act 闭环，Check 阶段基于 before/after 样本数据真实计算改善幅度与目标达成率。
        </div>
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>
          【质量与合规】依据《医疗质量管理办法》第十八条 · 杭州健澜科技有限公司
        </div>
      </div>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* 创建项目 */}
        <Card title="① 新建 PDCA 改进项目（Plan）" size="small">
          <Form form={form} layout="inline" initialValues={{ direction: 'lower_better', unit: '‰' }}>
            <Form.Item name="name" label="项目名" rules={[{ required: true }]}>
              <Input placeholder="如：降低住院跌倒发生率" style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="dept" label="科室" rules={[{ required: true }]}>
              <Input placeholder="如：神经内科" style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="leader" label="负责人" rules={[{ required: true }]}>
              <Input placeholder="项目负责人" style={{ width: 110 }} />
            </Form.Item>
            <Form.Item name="metric" label="指标" rules={[{ required: true }]}>
              <Input placeholder="如：跌倒发生率" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="unit" label="单位">
              <Input style={{ width: 60 }} />
            </Form.Item>
            <Form.Item name="direction" label="方向">
              <Select style={{ width: 130 }}>
                <Select.Option value="lower_better">越低越好</Select.Option>
                <Select.Option value="higher_better">越高越好</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="baseline" label="基线">
              <InputNumber style={{ width: 80 }} />
            </Form.Item>
            <Form.Item name="goal" label="目标">
              <InputNumber style={{ width: 80 }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" loading={loading} onClick={handleCreate} style={{ background: DEEP, borderColor: DEEP }}>
                创建项目
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 阶段流转 */}
        {project && (
          <Card title="② PDCA 阶段流转" size="small">
            <Steps
              current={currentStep}
              size="small"
              items={PHASE_META.map((p) => ({ title: p.title, description: p.desc, icon: p.icon }))}
            />
            <div style={{ marginTop: 16 }}>
              <Space>
                <Tag color={DEEP}>当前阶段：{project.phase}</Tag>
                <Tag>负责人：{project.leader}</Tag>
                <Tag>科室：{project.dept}</Tag>
                {project.closed && <Tag color="success"><CheckCircleOutlined /> 已闭环</Tag>}
              </Space>
              <div style={{ marginTop: 12 }}>
                {project.phase === 'Plan' && (
                  <Button type="primary" onClick={() => handleAdvance('Do')} style={{ background: DEEP, borderColor: DEEP }}>
                    提交计划，进入 Do
                  </Button>
                )}
                {project.phase === 'Do' && (
                  <Button type="primary" onClick={() => handleAdvance('Check')} style={{ background: DEEP, borderColor: DEEP }}>
                    实施完成，进入 Check
                  </Button>
                )}
                {project.phase === 'Check' && (
                  <Button type="primary" onClick={() => handleAdvance('Act')} style={{ background: DEEP, borderColor: DEEP }}>
                    完成评估，进入 Act
                  </Button>
                )}
                {project.phase === 'Act' && (
                  <Button onClick={() => handleAdvance('Plan')}>遗留问题转入下一循环</Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Check 前后对比 */}
        {project && project.phase === 'Check' && (
          <Card title="③ Check：before / after 数据对比" size="small">
            <Space size="large" wrap align="end">
              <div>
                <div style={{ marginBottom: 4, color: '#8c8c8c' }}>改进前样本量 n</div>
                <InputNumber value={before.sampleSize} onChange={(v) => setBefore({ ...before, sampleSize: Number(v) || 0 })} />
              </div>
              <div>
                <div style={{ marginBottom: 4, color: '#8c8c8c' }}>改进前率值</div>
                <InputNumber value={before.rate} onChange={(v) => setBefore({ ...before, rate: Number(v) || 0 })} addonAfter={project?.target.unit} />
              </div>
              <div>
                <div style={{ marginBottom: 4, color: '#8c8c8c' }}>改进后样本量 n</div>
                <InputNumber value={after.sampleSize} onChange={(v) => setAfter({ ...after, sampleSize: Number(v) || 0 })} />
              </div>
              <div>
                <div style={{ marginBottom: 4, color: '#8c8c8c' }}>改进后率值</div>
                <InputNumber value={after.rate} onChange={(v) => setAfter({ ...after, rate: Number(v) || 0 })} addonAfter={project?.target.unit} />
              </div>
              <Button type="primary" loading={loading} onClick={handleEffect} style={{ background: DEEP, borderColor: DEEP }}>
                计算效果
              </Button>
            </Space>
          </Card>
        )}

        {/* 效果结果 */}
        {effect && (
          <Card title="④ 效果评估结果" size="small" style={{ background: DEEP_BG }}>
            <Space size="large" wrap>
              <Statistic title="绝对变化" value={Number(effect.absoluteDelta)} suffix={project?.target.unit} />
              <Statistic title="相对改善" value={Number(effect.improvementPct)} suffix="%" />
              <Statistic title="目标差距关闭率" value={Math.round(Number(effect.goalAttainment) * 100)} suffix="%" />
              <Tag
                color={
                  effect.verdict === 'met' ? 'success' : effect.verdict === 'partial' ? 'warning' : 'error'
                }
              >
                {effect.verdict === 'met' ? '达标' : effect.verdict === 'partial' ? '部分达标' : '未达标'}
              </Tag>
              {Boolean(effect.underpowered) && <Tag color="orange">样本量不足（n&lt;30），结论需谨慎</Tag>}
            </Space>
            <div style={{ marginTop: 12, color: '#262626', fontSize: 13 }}>{String(effect.summary)}</div>
          </Card>
        )}

        {/* 项目列表（占位，真实环境接 GET /api/v1/quality/pdca） */}
        <Card title="本科室 PDCA 项目" size="small">
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            dataSource={project ? [project] : []}
            columns={[
              { title: '项目', dataIndex: 'name' },
              { title: '科室', dataIndex: 'dept' },
              { title: '负责人', dataIndex: 'leader' },
              {
                title: '当前阶段',
                dataIndex: 'phase',
                render: (p: Phase) => <Tag color={DEEP}>{p}</Tag>,
              },
            ]}
          />
        </Card>
      </Space>
    </div>
  );
}
