/*
 * 健澜科技 jlmedaios - 疼痛管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.pain_management.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.pain_management.entity.PainAssessment;
import com.jlmedaios.monolith.pain_management.entity.PainRecord;
import com.jlmedaios.monolith.pain_management.service.PainManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 疼痛管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/pain")
public class PainManagementController {

    private final PainManagementService painManagementService;

    /**
     * 疼痛评估。
     *
     * @param body {assessmentNo, patientId, painScore, painLocation, painCharacter, medicationGiven}
     * @return Result<PainAssessment>
     */
    @PostMapping("/assess")
    public Result<PainAssessment> assess(@RequestBody Map<String, Object> body) {
        PainAssessment assessment = painManagementService.assess(
                String.valueOf(body.get("assessmentNo")),
                String.valueOf(body.get("patientId")),
                Integer.parseInt(String.valueOf(body.get("painScore"))),
                String.valueOf(body.get("painLocation")),
                String.valueOf(body.get("painCharacter")),
                String.valueOf(body.get("medicationGiven"))
        );
        return Result.ok(assessment);
    }

    /**
     * 疼痛历史。
     *
     * @param patientId 患者 ID
     * @return Result<List<PainAssessment>>
     */
    @GetMapping("/history/{patientId}")
    public Result<List<PainAssessment>> history(@PathVariable Long patientId) {
        return Result.ok(painManagementService.history(patientId));
    }

    /**
     * 重度疼痛列表。
     *
     * @return Result<List<PainAssessment>>
     */
    @GetMapping("/severe")
    public Result<List<PainAssessment>> severePainList() {
        return Result.ok(painManagementService.severePainList());
    }

    // ==================== PainRecord 疼痛评估管理（深化） ====================

    /**
     * 待随访患者列表。
     *
     * @return Result<List<PainRecord>>
     */
    @GetMapping("/pending")
    public Result<List<PainRecord>> pendingFollowUp() {
        return Result.ok(painManagementService.pendingFollowUp());
    }

    /**
     * 创建疼痛评估（PainRecord）。
     *
     * @param body {recordNo, patientId, painSite, painScore, painType}
     * @return Result<PainRecord>
     */
    @PostMapping("/record/assess")
    public Result<PainRecord> assessRecord(@RequestBody Map<String, Object> body) {
        PainRecord record = painManagementService.assess(
                String.valueOf(body.get("recordNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("painSite")),
                Integer.valueOf(String.valueOf(body.get("painScore"))),
                String.valueOf(body.get("painType"))
        );
        return Result.ok(record);
    }

    /**
     * 记录治疗方案。
     *
     * @param recordNo 记录编号
     * @param body    {treatmentType, followUpDate}
     * @return Result<PainRecord>
     */
    @PutMapping("/{recordNo}/treat")
    public Result<PainRecord> recordTreatment(@PathVariable String recordNo,
                                                @RequestBody Map<String, Object> body) {
        PainRecord record = painManagementService.recordTreatment(
                recordNo,
                String.valueOf(body.get("treatmentType")),
                LocalDate.parse(String.valueOf(body.get("followUpDate")))
        );
        return Result.ok(record);
    }

    /**
     * 患者疼痛史（PainRecord）。
     *
     * @param patientId 患者 ID
     * @return Result<List<PainRecord>>
     */
    @GetMapping("/record/{patientId}/history")
    public Result<List<PainRecord>> painHistory(@PathVariable Long patientId) {
        return Result.ok(painManagementService.painHistory(patientId));
    }
}
