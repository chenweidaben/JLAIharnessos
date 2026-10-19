/*
 * 健澜科技 jlmedaios - 皮肤科工作站 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.dermatology_workstation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.dermatology_workstation.entity.DermatologyRecord;
import com.jlmedaios.monolith.dermatology_workstation.service.DermatologyWorkstationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 皮肤科工作站 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dermatology")
public class DermatologyWorkstationController {

    private final DermatologyWorkstationService dermatologyWorkstationService;

    /**
     * 今日皮肤科患者。
     *
     * @return Result<List<DermatologyRecord>>
     */
    @GetMapping("/today")
    public Result<List<DermatologyRecord>> todayPatients() {
        return Result.ok(dermatologyWorkstationService.todayPatients());
    }

    /**
     * 创建皮损记录。
     *
     * @param body {recordNo, patientId, lesionLocation, lesionType, diagnosis}
     * @return Result<DermatologyRecord>
     */
    @PostMapping("/record")
    public Result<DermatologyRecord> createRecord(@RequestBody Map<String, Object> body) {
        DermatologyRecord record = dermatologyWorkstationService.createRecord(
                String.valueOf(body.get("recordNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("lesionLocation")),
                String.valueOf(body.get("lesionType")),
                String.valueOf(body.get("diagnosis"))
        );
        return Result.ok(record);
    }

    /**
     * 记录治疗方案。
     *
     * @param recordNo 记录编号
     * @param body    {treatmentPlan, followUpDate}
     * @return Result<DermatologyRecord>
     */
    @PutMapping("/{recordNo}/treat")
    public Result<DermatologyRecord> recordTreatment(@PathVariable String recordNo,
                                                      @RequestBody Map<String, Object> body) {
        DermatologyRecord record = dermatologyWorkstationService.recordTreatment(
                recordNo,
                String.valueOf(body.get("treatmentPlan")),
                LocalDate.parse(String.valueOf(body.get("followUpDate")))
        );
        return Result.ok(record);
    }

    /**
     * 患者皮肤病史。
     *
     * @param patientId 患者 ID
     * @return Result<List<DermatologyRecord>>
     */
    @GetMapping("/{patientId}/history")
    public Result<List<DermatologyRecord>> dermatologyHistory(@PathVariable Long patientId) {
        return Result.ok(dermatologyWorkstationService.dermatologyHistory(patientId));
    }
}
