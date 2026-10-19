/*
 * 健澜科技 jlmedaios - AI 助手对话 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ai_assistant.repository;

import com.jlmedaios.monolith.ai_assistant.entity.AssistantConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * AI 助手对话 Repository。
 */
@Repository
public interface AssistantConversationRepository extends JpaRepository<AssistantConversation, Long> {

    /**
     * 按医生 ID 查询 AI 助手对话。
     *
     * @param doctorId 医生 ID
     * @return AI 助手对话列表
     */
    List<AssistantConversation> findByDoctorId(String doctorId);
}
