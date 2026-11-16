/**
 * 健澜科技 jlmedaios - 电子病历编辑器核心组件
 *
 * 基于专业医疗级病历编辑内核，提供结构化病历书写、模板绑定、
 * 修订留痕、只读水印、AI 辅助等能力。品牌对外统一为「健澜病历编辑器」。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { Spin, Button, Space, message } from "antd";

// 全局 SDK 类型声明（自托管静态资源，非 npm 包）
declare global {
  interface Window {
    HMEditorLoader?: {
      createEditorAsync: (options: Record<string, unknown>) => Promise<EmrEditorInstance>;
      getInstance: (id: string) => EmrEditorInstance | null;
      destroyEditor: (id: string) => void;
    };
  }
}

export interface EmrEditorInstance {
  setDocContent: (doc: { code: string; docTplName: string; docContent: string }) => void;
  getDocContent: () => Promise<{ code: string; docTplName: string; docContent: string }>;
  setReadOnly: (readonly: boolean) => void;
  setDesignMode: (design: boolean) => void;
  setReviseMode: (revise: boolean) => void;
  getHtml: () => string;
  setHtml: (html: string) => void;
  insertText: (text: string) => void;
  print: () => void;
  [key: string]: unknown;
}

export interface EmrEditorProps {
  /** 病历编码 */
  docCode?: string;
  /** 病历模板名称 */
  docTitle?: string;
  /** 初始 HTML 内容 */
  initialContent?: string;
  /** 只读模式 */
  readOnly?: boolean;
  /** 修订模式 */
  reviseMode?: boolean;
  /** 设计模式 */
  designMode?: boolean;
  /** 容器高度（px） */
  height?: number;
  /** 内容变更回调 */
  onChange?: (content: string) => void;
  /** 编辑器就绪回调 */
  onReady?: (editor: EmrEditorInstance) => void;
}

export interface EmrEditorRef {
  /** 获取编辑器实例 */
  getEditor: () => EmrEditorInstance | null;
  /** 获取当前病历内容 */
  getContent: () => Promise<{ code: string; title: string; content: string }>;
  /** 设置内容 */
  setContent: (content: string) => void;
  /** 保存（触发 onChange） */
  save: () => Promise<void>;
}

const SDK_SCRIPT = "/hm-editor/hmEditor/iframe/HmEditorIfame.js";
const SDK_HOST = "/hm-editor";

function loadSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.HMEditorLoader) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("病历编辑器 SDK 加载失败")));
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("病历编辑器 SDK 加载失败"));
    document.head.appendChild(script);
  });
}

export const EmrEditor = forwardRef<EmrEditorRef, EmrEditorProps>(function EmrEditor(
  {
    docCode = "emr-draft",
    docTitle = "新建病历",
    initialContent = "",
    readOnly = false,
    reviseMode = false,
    designMode = false,
    height = 600,
    onChange,
    onReady,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EmrEditorInstance | null>(null);
  const editorIdRef = useRef<string>(`emr_editor_${Date.now()}`);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current,
    getContent: async () => {
      const ed = editorRef.current;
      if (!ed) return { code: docCode, title: docTitle, content: "" };
      try {
        const doc = await ed.getDocContent();
        return { code: doc.code, title: doc.docTplName, content: doc.docContent };
      } catch {
        return { code: docCode, title: docTitle, content: ed.getHtml?.() ?? "" };
      }
    },
    setContent: (content: string) => {
      editorRef.current?.setHtml?.(content);
    },
    save: async () => {
      const ed = editorRef.current;
      if (!ed) return;
      try {
        const doc = await ed.getDocContent();
        onChange?.(doc.docContent);
        message.success("病历已保存");
      } catch {
        onChange?.(ed.getHtml?.() ?? "");
        message.success("病历已保存");
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;
    let destroyed = false;

    async function init() {
      try {
        await loadSdk();
        if (cancelled) return;
        if (!containerRef.current || !window.HMEditorLoader) return;

        const editor = await window.HMEditorLoader.createEditorAsync({
          container: containerRef.current,
          id: editorIdRef.current,
          sdkHost: SDK_HOST,
          readOnly,
          reviseMode,
          designMode,
          style: { width: "100%", height: `${height}px`, border: "none" },
          onReady: (ed: EmrEditorInstance) => {
            if (destroyed) return;
            editorRef.current = ed;
            if (initialContent) {
              ed.setDocContent({
                code: docCode,
                docTplName: docTitle,
                docContent: initialContent,
              });
            }
            setLoading(false);
            onReady?.(ed);
          },
        });

        if (cancelled) return;
        editorRef.current = editor;
        setLoading(false);
        onReady?.(editor);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "编辑器初始化失败");
        setLoading(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
      destroyed = true;
      try {
        window.HMEditorLoader?.destroyEditor(editorIdRef.current);
      } catch {
        // 忽略销毁异常
      }
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(async () => {
    const ed = editorRef.current;
    if (!ed) return;
    try {
      const doc = await ed.getDocContent();
      onChange?.(doc.docContent);
      message.success("病历已保存");
    } catch {
      onChange?.(ed.getHtml?.() ?? "");
      message.success("病历已保存");
    }
  }, [onChange]);

  return (
    <div className="emr-editor-wrapper" style={{ border: "1px solid #d9d9d9", borderRadius: 8, overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px", background: "#0A2540", color: "#fff",
      }}>
        <Space size="middle">
          <span style={{ fontWeight: 600 }}>{docTitle}</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>健澜病历编辑器</span>
        </Space>
        <Space>
          {readOnly && <span style={{ fontSize: 12, color: "#ffd666" }}>只读模式</span>}
          {reviseMode && <span style={{ fontSize: 12, color: "#95de64" }}>修订模式</span>}
          {!readOnly && <Button size="small" type="primary" onClick={handleSave}>保存病历</Button>}
        </Space>
      </div>
      <div style={{ position: "relative", background: "#fff" }}>
        {loading && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 10,
          }}>
            <Spin size="large" tip="病历编辑器加载中..." />
          </div>
        )}
        {error && (
          <div style={{ padding: 48, textAlign: "center", color: "#ff4d4f" }}>
            编辑器加载失败：{error}
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height: `${height}px` }} />
      </div>
    </div>
  );
});

export default EmrEditor;
