/*
 * 健澜科技 jlmedaios - 眼科工作站 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ophthalmology_workstation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.ophthalmology_workstation.entity.EyeExamRecord;
import com.jlmedaios.monolith.ophthalmology_workstation.service.OphthalmologyWorkstationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 眼科工作站 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/eye")
public class OphthalmologyWorkstationController {

    private final OphthalmologyWorkstationService ophthalmologyWorkstationService;

    /**
     * 今日眼科患者。
     *
     * @return Result<List<EyeExamRecord>>
     */
    @GetMapping("/today")
    public Result<List<EyeExamRecord>> todayPatients() {
        return Result.ok(ophthalmologyWorkstationService.todayPatients());
    }

    /**
     * 创建检查记录。
     *
     * @param body {recordNo, patientId, visitType, visualScOD, visualScOS, intraocularPressureOD, intraocularPressureOS, lensExam, fundusExam}
     * @return Result<EyeExamRecord>
     */
    @PostMapping("/exam")
    public Result<EyeExamRecord> createExam(@RequestBody Map<String, Object> body) {
        EyeExamRecord record = ophthalmologyWorkstationService.createExam(
                String.valueOf(body.get("recordNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("visitType")),
                String.valueOf(body.get("visualScOD")),
                String.valueOf(body.get("visualScOS")),
                new BigDecimal(String.valueOf(body.get("intraocularPressureOD"))),
                new BigDecimal(String.valueOf(body.get("intraocularPressureOS"))),
                String.valueOf(body.get("lensExam")),
                String.valueOf(body.get("fundusExam"))
        );
        return Result.ok(record);
    }

    /**
     * 开具诊断。
     *
     * @param recordNo 记录编号
     * @param body    {diagnosis, prescription}
     * @return Result<EyeExamRecord>
     */
    @PutMapping("/{recordNo}/diagnose")
    public Result<EyeExamRecord> makeDiagnosis(@PathVariable String recordNo,
                                                @RequestBody Map<String, Object> body) {
        return Result.ok(ophthalmologyWorkstationService.makeDiagnosis(
                recordNo,
                String.valueOf(body.get("diagnosis")),
                String.valueOf(body.get("prescription"))
        ));
    }

    /**
     * 患者眼科史。
     *
     * @param patientId 患者 ID
     * @return Result<List<EyeExamRecord>>
     */
    @GetMapping("/{patientId}/history")
    public Result<List<EyeExamRecord>> eyeHistory(@PathVariable Long patientId) {
        return Result.ok(ophthalmologyWorkstationService.eyeHistory(patientId));
    }
}
