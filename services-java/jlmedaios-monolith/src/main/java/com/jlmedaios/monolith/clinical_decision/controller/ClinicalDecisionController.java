/*
 * 健澜科技 jlmedaios - 临床决策支持 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_decision.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.clinical_decision.entity.CDSHit;
import com.jlmedaios.monolith.clinical_decision.entity.CDSRule;
import com.jlmedaios.monolith.clinical_decision.service.ClinicalDecisionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 临床决策支持 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/cds")
public class ClinicalDecisionController {

    private final ClinicalDecisionService clinicalDecisionService;

    /**
     * 当前生效规则列表。
     *
     * @return Result<List<CDSRule>>
     */
    @GetMapping("/rules")
    public Result<List<CDSRule>> activeRules() {
        return Result.ok(clinicalDecisionService.activeRules());
    }

    /**
     * 评估触发的规则。
     *
     * @param body {patientId, encounterId}
     * @return Result<List<CDSHit>>
     */
    @PostMapping("/evaluate")
    public Result<List<CDSHit>> evaluate(@RequestBody Map<String, Object> body) {
        List<CDSHit> hits = clinicalDecisionService.evaluate(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                Long.valueOf(String.valueOf(body.get("encounterId")))
        );
        return Result.ok(hits);
    }

    /**
     * 医生确认/忽略规则。
     *
     * @param id 命中记录 ID
     * @param body {acknowledgedBy}
     * @return Result<CDSHit>
     */
    @PutMapping("/hit/{id}/ack")
    public Result<CDSHit> acknowledge(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return clinicalDecisionService.acknowledge(
                id,
                String.valueOf(body.get("acknowledgedBy"))
        ).map(Result::ok).orElseGet(() -> Result.ok(null));
    }
}
