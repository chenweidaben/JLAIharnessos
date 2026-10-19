/*
 * 健澜科技 jlmedaios - 药品相互作用 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.drug_interaction.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.drug_interaction.entity.DrugInteractionRule;
import com.jlmedaios.monolith.drug_interaction.entity.InteractionCheckLog;
import com.jlmedaios.monolith.drug_interaction.service.DrugInteractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 药品相互作用 Controller。
 *
 * <p>与 ai_prescription_review.py 形成 Java 规则引擎 + AI 辅助双保险</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/drug/interaction")
public class DrugInteractionController {

    private final DrugInteractionService drugInteractionService;

    /**
     * 检查药品相互作用。
     *
     * @param body {medications: list, patientId: Long}
     * @return Result<Map<String, Object>>
     */
    @PostMapping("/check")
    public Result<Map<String, Object>> check(@RequestBody Map<String, Object> body) {
        List<String> medications = (List<String>) body.get("medications");
        Long patientId = Long.valueOf(String.valueOf(body.get("patientId")));
        return Result.ok(drugInteractionService.check(medications, patientId));
    }

    /**
     * 全部规则列表。
     *
     * @return Result<List<DrugInteractionRule>>
     */
    @GetMapping("/rules")
    public Result<List<DrugInteractionRule>> allRules() {
        return Result.ok(drugInteractionService.allRules());
    }

    /**
     * 检查日志。
     *
     * @param patientId 患者 ID
     * @return Result<List<InteractionCheckLog>>
     */
    @GetMapping("/log")
    public Result<List<InteractionCheckLog>> checkLog(@RequestParam Long patientId) {
        return Result.ok(drugInteractionService.checkLog(patientId));
    }
}
