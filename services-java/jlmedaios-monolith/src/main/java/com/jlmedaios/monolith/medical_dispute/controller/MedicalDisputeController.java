/*
 * 健澜科技 jlmedaios - 医疗纠纷处理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_dispute.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.medical_dispute.entity.DisputeCase;
import com.jlmedaios.monolith.medical_dispute.service.MedicalDisputeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 医疗纠纷处理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dispute")
public class MedicalDisputeController {

    private final MedicalDisputeService medicalDisputeService;

    /**
     * 纠纷上报。
     *
     * @param body {caseNo, patientId, department, disputeType, description}
     * @return Result<DisputeCase>
     */
    @PostMapping("/report")
    public Result<DisputeCase> report(@RequestBody Map<String, Object> body) {
        DisputeCase dispute = medicalDisputeService.report(
                String.valueOf(body.get("caseNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("department")),
                String.valueOf(body.get("disputeType")),
                String.valueOf(body.get("description"))
        );
        return Result.ok(dispute);
    }

    /**
     * 开始调查。
     *
     * @param id 案件 ID
     * @return Result<DisputeCase>
     */
    @PutMapping("/{id}/investigate")
    public Result<DisputeCase> startInvestigate(@PathVariable Long id) {
        return medicalDisputeService.startInvestigate(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 结案。
     *
     * @param id   案件 ID
     * @param body {compensationAmount}
     * @return Result<DisputeCase>
     */
    @PutMapping("/{id}/close")
    public Result<DisputeCase> close(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return medicalDisputeService.close(
                id,
                new BigDecimal(String.valueOf(body.get("compensationAmount")))
        ).map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 待处理列表。
     *
     * @return Result<List<DisputeCase>>
     */
    @GetMapping("/pending")
    public Result<List<DisputeCase>> pendingList() {
        return Result.ok(medicalDisputeService.pendingList());
    }
}
