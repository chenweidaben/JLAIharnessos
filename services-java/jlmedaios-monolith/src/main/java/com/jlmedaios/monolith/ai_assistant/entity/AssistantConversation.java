/*
 * 健澜科技 jlmedaios - AI 助手对话实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ai_assistant.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * AI 助手对话实体。
 *
 * <p>append-only: AI 助手对话记录不可修改；生产接 vLLM+RAG 检索患者病历，H2 下 mock</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "assistant_conversation")
public class AssistantConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id")
    private String conversationId;

    // @Sensitive 医生 ID，脱敏存储
    @Column(name = "doctor_id")
    private String doctorId;

    // @Sensitive 患者 ID，脱敏存储
    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "message_history_json", columnDefinition = "TEXT")
    private String messageHistoryJSON;

    @Column(name = "created_time")
    @Builder.Default
    private LocalDateTime createdTime = LocalDateTime.now();
}
