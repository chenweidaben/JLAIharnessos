/*
 * 健澜科技 jlmedaios - 临床决策支持 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_decision_support.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.clinical_decision_support.entity.CDSSRule;
import com.jlmedaios.monolith.clinical_decision_support.service.ClinicalDecisionSupportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 临床决策支持 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/cdss")
public class ClinicalDecisionSupportController {

    private final ClinicalDecisionSupportService clinicalDecisionSupportService;

    /**
     * 规则列表。
     *
     * @return Result<List<CDSSRule>>
     */
    @GetMapping("/rules")
    public Result<List<CDSSRule>> ruleList() {
        return Result.ok(clinicalDecisionSupportService.ruleList());
    }

    /**
     * 临床决策检查。
     *
     * @param body {diagnosis, medications, labResults}
     * @return Result<List<CDSSRule>>
     */
    @PostMapping("/check")
    public Result<List<CDSSRule>> check(@RequestBody Map<String, Object> body) {
        return Result.ok(clinicalDecisionSupportService.check(
                String.valueOf(body.get("diagnosis")),
                String.valueOf(body.get("medications")),
                String.valueOf(body.get("labResults"))
        ));
    }

    /**
     * 启用/停用规则。
     *
     * @param code 规则编码
     * @return Result<CDSSRule>
     */
    @PutMapping("/rule/{code}/toggle")
    public Result<CDSSRule> toggleRule(@PathVariable String code) {
        return Result.ok(clinicalDecisionSupportService.toggleRule(code));
    }
}
