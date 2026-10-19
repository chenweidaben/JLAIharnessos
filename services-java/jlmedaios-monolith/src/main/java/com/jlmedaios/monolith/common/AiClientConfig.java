/*
 * 健澜科技 jlmedaios - AI 客户端配置（本地 vLLM，禁止境外大模型）
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.common;

import org.springframework.stereotype.Component;

/**
 * AI 客户端配置。
 *
 * <p>合规红线：AI 接口统一走本地 vLLM: http://127.0.0.1:8000/v1，
 * 禁止任何境外大模型 API 调用（OpenAI / Claude / Gemini 等）。</p>
 */
@Component
public class AiClientConfig {

    /**
     * 本地 vLLM 接口地址（预留）。
     */
    public static final String LOCAL_VLLM_URL = "http://127.0.0.1:8000/v1";

    /**
     * 禁止使用的境外大模型 API 列表（合规红线）。
     */
    private static final String[] FORBIDDEN_EXTERNAL_APIS = {
            "https://api.openai.com",
            "https://api.anthropic.com",
            "https://generativelanguage.googleapis.com",
            "https://api.cohere.ai"
    };

    /**
     * 调用本地 vLLM（mock）。
     *
     * @param prompt 用户提示
     * @return mock 响应
     */
    public String callLocalLlm(String prompt) {
        // 实际实现：HTTP 调用 LOCAL_VLLM_URL/chat/completions
        // 当前阶段返回 mock 响应，待 vLLM 部署后接入
        return "vLLM mock response: " + prompt;
    }
}
