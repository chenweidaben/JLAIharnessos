/*
 * 健澜科技 jlmedaios - 耳鼻喉工作站 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ent_workstation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.ent_workstation.entity.ENTRecord;
import com.jlmedaios.monolith.ent_workstation.service.EntWorkstationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 耳鼻喉工作站 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ent")
public class EntWorkstationController {

    private final EntWorkstationService entWorkstationService;

    /**
     * 今日耳鼻喉患者。
     *
     * @return Result<List<ENTRecord>>
     */
    @GetMapping("/today")
    public Result<List<ENTRecord>> todayPatients() {
        return Result.ok(entWorkstationService.todayPatients());
    }

    /**
     * 创建检查记录。
     *
     * @param body {recordNo, patientId, department, examType, findings}
     * @return Result<ENTRecord>
     */
    @PostMapping("/exam")
    public Result<ENTRecord> createExam(@RequestBody Map<String, Object> body) {
        ENTRecord record = entWorkstationService.createExam(
                String.valueOf(body.get("recordNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("department")),
                String.valueOf(body.get("examType")),
                String.valueOf(body.get("findings"))
        );
        return Result.ok(record);
    }

    /**
     * 开具诊断。
     *
     * @param recordNo 记录编号
     * @param body    {diagnosis, prescription}
     * @return Result<ENTRecord>
     */
    @PutMapping("/{recordNo}/diagnose")
    public Result<ENTRecord> makeDiagnosis(@PathVariable String recordNo,
                                            @RequestBody Map<String, Object> body) {
        return Result.ok(entWorkstationService.makeDiagnosis(
                recordNo,
                String.valueOf(body.get("diagnosis")),
                String.valueOf(body.get("prescription"))
        ));
    }

    /**
     * 患者耳鼻喉史。
     *
     * @param patientId 患者 ID
     * @return Result<List<ENTRecord>>
     */
    @GetMapping("/{patientId}/history")
    public Result<List<ENTRecord>> entHistory(@PathVariable Long patientId) {
        return Result.ok(entWorkstationService.entHistory(patientId));
    }
}
