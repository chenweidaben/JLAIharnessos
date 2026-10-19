/*
 * 健澜科技 jlmedaios - AI 医生助手 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ai_assistant.service;

import com.jlmedaios.monolith.ai_assistant.entity.AssistantConversation;
import com.jlmedaios.monolith.ai_assistant.repository.AssistantConversationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * AI 医生助手 Service。
 *
 * <p>append-only: AI 助手对话记录不可修改；生产接 vLLM+RAG 检索患者病历，H2 下 mock</p>
 */
@Service
@RequiredArgsConstructor
public class AiAssistantService {

    private final AssistantConversationRepository assistantConversationRepository;

    /**
     * AI 医生助手对话（mock 返回回复）。
     *
     * @param conversationId 会话 ID
     * @param doctorId      医生 ID
     * @param patientId     患者 ID
     * @param userMessage   用户消息
     * @return 已持久化的 AI 助手对话
     */
    public AssistantConversation chat(String conversationId, String doctorId,
                                       String patientId, String userMessage) {
        AssistantConversation conversation = AssistantConversation.builder()
                .conversationId(conversationId)
                .doctorId(doctorId)
                .patientId(patientId)
                .messageHistoryJSON("[{\"user\":\"" + userMessage + "\",\"assistant\":\"建议完善心电图和心肌酶检查\"}]")
                .build();
        return assistantConversationRepository.save(conversation);
    }

    /**
     * 对话历史。
     *
     * @param doctorId 医生 ID
     * @return AI 助手对话列表
     */
    public List<AssistantConversation> history(String doctorId) {
        return assistantConversationRepository.findByDoctorId(doctorId);
    }
}
