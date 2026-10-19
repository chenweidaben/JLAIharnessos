/*
 * 健澜科技 jlmedaios - AI 医生助手 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ai_assistant;

import com.jlmedaios.monolith.ai_assistant.entity.AssistantConversation;
import com.jlmedaios.monolith.ai_assistant.service.AiAssistantService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * AI 医生助手 Service 测试。
 */
@SpringBootTest
public class AiAssistantServiceTest {

    @Autowired
    private AiAssistantService aiAssistantService;

    @Test
    void testChat() {
        AssistantConversation conversation = aiAssistantService.chat(
                "CONV-001", "D001", "P001", "患者胸闷怎么办？");
        assertNotNull(conversation.getId());
        assertEquals("CONV-001", conversation.getConversationId());
    }

    @Test
    void testHistory() {
        aiAssistantService.chat("CONV-002", "D002", "P002", "帮我看下这个病历");
        List<AssistantConversation> history = aiAssistantService.history("D002");
        assertNotNull(history);
        assertTrue(history.size() >= 1);
    }

    @Test
    void testHistoryEmpty() {
        List<AssistantConversation> history = aiAssistantService.history("D999");
        assertNotNull(history);
    }
}
