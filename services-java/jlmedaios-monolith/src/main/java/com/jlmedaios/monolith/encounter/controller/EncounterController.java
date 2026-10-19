/*
 * 健澜科技 jlmedaios - 诊疗 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.encounter.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.encounter.entity.EncounterRecord;
import com.jlmedaios.monolith.encounter.service.EncounterService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 诊疗 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/encounter")
public class EncounterController {

    private final EncounterService encounterService;

    /**
     * 记录一次诊疗。
     *
     * @param body 诊疗记录请求体
     * @return Result<EncounterRecord>
     */
    @PostMapping("/record")
    public Result<EncounterRecord> record(@RequestBody Map<String, Object> body) {
        EncounterRecord record = encounterService.recordEncounter(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                Long.valueOf(String.valueOf(body.get("visitId"))),
                String.valueOf(body.get("deptCode")),
                String.valueOf(body.get("doctorName")),
                String.valueOf(body.get("chiefComplaint")),
                String.valueOf(body.get("diagnosis")),
                String.valueOf(body.get("ordersSnapshot")),
                String.valueOf(body.get("chargeSnapshot")),
                String.valueOf(body.get("outcome")),
                Integer.valueOf(String.valueOf(body.get("durationMinutes")))
        );
        return Result.ok(record);
    }

    /**
     * 按 ID 查询诊疗记录。
     *
     * @param id 诊疗记录 ID
     * @return Result<EncounterRecord>
     */
    @GetMapping("/{id}")
    public Result<EncounterRecord> getById(@PathVariable Long id) {
        return encounterService.getEncounter(id)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "诊疗记录不存在"));
    }

    /**
     * 按患者 ID 查询诊疗记录列表。
     *
     * @param patientId 患者 ID
     * @return Result<List<EncounterRecord>>
     */
    @GetMapping("/patient/{patientId}")
    public Result<List<EncounterRecord>> listByPatient(@PathVariable Long patientId) {
        return Result.ok(encounterService.listByPatient(patientId));
    }

    /**
     * 按科室统计诊疗数据。
     *
     * @param deptCode 科室编码
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/stats/dept/{deptCode}")
    public Result<Map<String, Object>> getStatistics(@PathVariable String deptCode) {
        return Result.ok(encounterService.getStatistics(deptCode));
    }
}
