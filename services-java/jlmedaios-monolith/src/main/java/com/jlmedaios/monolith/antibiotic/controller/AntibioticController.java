/*
 * 健澜科技 jlmedaios - 抗菌药物 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.antibiotic.controller;

import com.jlmedaios.monolith.antibiotic.entity.AntibioticRecord;
import com.jlmedaios.monolith.antibiotic.service.AntibioticService;
import com.jlmedaios.monolith.common.Result;
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
 * 抗菌药物 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/antibiotic")
public class AntibioticController {

    private final AntibioticService antibioticService;

    /**
     * 开立抗菌药物。
     *
     * @param body {patientId, drugName, dose, reason, level}
     * @return Result<AntibioticRecord>
     */
    @PostMapping("/order")
    public Result<AntibioticRecord> order(@RequestBody Map<String, Object> body) {
        AntibioticRecord record = antibioticService.order(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("drugName")),
                String.valueOf(body.get("dose")),
                String.valueOf(body.get("reason")),
                String.valueOf(body.get("level"))
        );
        return Result.ok(record);
    }

    /**
     * 按患者 ID 查询抗菌药物记录列表。
     *
     * @param patientId 患者 ID
     * @return Result<List<AntibioticRecord>>
     */
    @GetMapping("/patient/{patientId}")
    public Result<List<AntibioticRecord>> listByPatient(@PathVariable Long patientId) {
        return Result.ok(antibioticService.listByPatient(patientId));
    }

    /**
     * 药师审核。
     *
     * @param id   抗菌药物记录 ID
     * @param body {pharmacistName, approved, consultationNote}
     * @return Result<AntibioticRecord>
     */
    @PutMapping("/{id}/review")
    public Result<AntibioticRecord> review(@PathVariable Long id,
                                           @RequestBody Map<String, Object> body) {
        String pharmacistName = String.valueOf(body.get("pharmacistName"));
        boolean approved = Boolean.parseBoolean(String.valueOf(body.get("approved")));
        String consultationNote = String.valueOf(body.get("consultationNote"));
        return antibioticService.review(id, pharmacistName, approved, consultationNote)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "抗菌药物记录不存在"));
    }
}
