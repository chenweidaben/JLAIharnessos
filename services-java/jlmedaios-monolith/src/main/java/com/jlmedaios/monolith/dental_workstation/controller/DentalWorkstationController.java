/*
 * 健澜科技 jlmedaios - 口腔科工作站 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.dental_workstation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.dental_workstation.entity.DentalRecord;
import com.jlmedaios.monolith.dental_workstation.service.DentalWorkstationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 口腔科工作站 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dental")
public class DentalWorkstationController {

    private final DentalWorkstationService dentalWorkstationService;

    /**
     * 今日口腔科患者。
     *
     * @return Result<List<DentalRecord>>
     */
    @GetMapping("/today")
    public Result<List<DentalRecord>> todayPatients() {
        return Result.ok(dentalWorkstationService.todayPatients());
    }

    /**
     * 创建口腔检查记录。
     *
     * @param body {recordNo, patientId, visitType, examType, teethConditionJSON}
     * @return Result<DentalRecord>
     */
    @PostMapping("/exam")
    public Result<DentalRecord> createExam(@RequestBody Map<String, Object> body) {
        DentalRecord record = dentalWorkstationService.createExam(
                String.valueOf(body.get("recordNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("visitType")),
                String.valueOf(body.get("examType")),
                String.valueOf(body.get("teethConditionJSON"))
        );
        return Result.ok(record);
    }

    /**
     * 制定治疗计划。
     *
     * @param recordNo 记录编号
     * @param body    {diagnosis, treatmentPlan}
     * @return Result<DentalRecord>
     */
    @PutMapping("/{recordNo}/plan")
    public Result<DentalRecord> makeTreatmentPlan(@PathVariable String recordNo,
                                                   @RequestBody Map<String, Object> body) {
        return Result.ok(dentalWorkstationService.makeTreatmentPlan(
                recordNo,
                String.valueOf(body.get("diagnosis")),
                String.valueOf(body.get("treatmentPlan"))
        ));
    }

    /**
     * 患者口腔科史。
     *
     * @param patientId 患者 ID
     * @return Result<List<DentalRecord>>
     */
    @GetMapping("/{patientId}/history")
    public Result<List<DentalRecord>> dentalHistory(@PathVariable Long patientId) {
        return Result.ok(dentalWorkstationService.dentalHistory(patientId));
    }
}
