/*
 * 健澜科技 jlmedaios - 临床决策支持深化 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_deep.controller;

import com.jlmedaios.monolith.clinical_deep.entity.CDSEvaluation;
import com.jlmedaios.monolith.clinical_deep.entity.CDSRule;
import com.jlmedaios.monolith.clinical_deep.service.ClinicalDeepService;
import com.jlmedaios.monolith.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 临床决策支持深化 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/cds")
public class ClinicalDeepController {

    private final ClinicalDeepService clinicalDeepService;

    /**
     * 规则列表。
     *
     * @return Result<List<CDSRule>>
     */
    @GetMapping("/rules")
    public Result<List<CDSRule>> ruleList() {
        return Result.ok(clinicalDeepService.ruleList());
    }

    /**
     * 评估触发规则。
     *
     * @param body {patientId}
     * @return Result<List<CDSEvaluation>>
     */
    @PostMapping("/evaluate")
    public Result<List<CDSEvaluation>> evaluate(@RequestBody Map<String, Object> body) {
        return Result.ok(clinicalDeepService.evaluate(
                Long.valueOf(String.valueOf(body.get("patientId")))
        ));
    }

    /**
     * 医生反馈。
     *
     * @param id   评估记录 ID
     * @param body {actionTaken, feedback}
     * @return Result<CDSEvaluation>
     */
    @PutMapping("/evaluation/{id}/feedback")
    public Result<CDSEvaluation> feedback(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return clinicalDeepService.feedback(
                id,
                String.valueOf(body.get("actionTaken")),
                String.valueOf(body.get("feedback"))
        ).map(Result::ok).orElseGet(() -> Result.ok(null));
    }
}
