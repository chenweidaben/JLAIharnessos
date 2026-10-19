/*
 * 健澜科技 jlmedaios - AI 医生助手 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ai_assistant.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.ai_assistant.entity.AssistantConversation;
import com.jlmedaios.monolith.ai_assistant.service.AiAssistantService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AI 医生助手 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/assistant")
public class AiAssistantController {

    private final AiAssistantService aiAssistantService;

    /**
     * AI 医生助手对话。
     *
     * @param body {conversationId, doctorId, patientId, userMessage}
     * @return Result<AssistantConversation>
     */
    @PostMapping("/chat")
    public Result<AssistantConversation> chat(@RequestBody Map<String, Object> body) {
        AssistantConversation conversation = aiAssistantService.chat(
                String.valueOf(body.get("conversationId")),
                String.valueOf(body.get("doctorId")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("userMessage"))
        );
        return Result.ok(conversation);
    }

    /**
     * 对话历史。
     *
     * @param doctorId 医生 ID
     * @return Result<List<AssistantConversation>>
     */
    @GetMapping("/history/{doctorId}")
    public Result<List<AssistantConversation>> history(@PathVariable String doctorId) {
        return Result.ok(aiAssistantService.history(doctorId));
    }
}
