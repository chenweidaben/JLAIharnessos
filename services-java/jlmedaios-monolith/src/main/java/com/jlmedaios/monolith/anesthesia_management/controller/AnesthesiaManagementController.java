/*
 * 健澜科技 jlmedaios - 麻醉管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.anesthesia_management.controller;

import com.jlmedaios.monolith.anesthesia_management.entity.AnesthesiaRecord;
import com.jlmedaios.monolith.anesthesia_management.service.AnesthesiaManagementService;
import com.jlmedaios.monolith.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 麻醉管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/anesthesia")
public class AnesthesiaManagementController {

    private final AnesthesiaManagementService anesthesiaManagementService;

    /**
     * 创建麻醉记录。
     *
     * @param body {recordNo, scheduleNo, patientId, anesthesiaType, anesthesiaPlan}
     * @return Result<AnesthesiaRecord>
     */
    @PostMapping("/record")
    public Result<AnesthesiaRecord> createRecord(@RequestBody Map<String, Object> body) {
        AnesthesiaRecord record = anesthesiaManagementService.createRecord(
                String.valueOf(body.get("recordNo")),
                String.valueOf(body.get("scheduleNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("anesthesiaType")),
                String.valueOf(body.get("anesthesiaPlan"))
        );
        return Result.ok(record);
    }

    /**
     * 术中监测数据。
     *
     * @param id   记录 ID
     * @param body {monitoringDataJSON}
     * @return Result<AnesthesiaRecord>
     */
    @PutMapping("/record/{id}/monitor")
    public Result<AnesthesiaRecord> monitor(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return anesthesiaManagementService.monitor(id, String.valueOf(body.get("monitoringDataJSON")))
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 麻醉复苏。
     *
     * @param id   记录 ID
     * @param body {complications}
     * @return Result<AnesthesiaRecord>
     */
    @PutMapping("/record/{id}/recover")
    public Result<AnesthesiaRecord> recover(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return anesthesiaManagementService.recover(id, String.valueOf(body.get("complications")))
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 今日麻醉记录。
     *
     * @return Result<List<AnesthesiaRecord>>
     */
    @GetMapping("/today")
    public Result<List<AnesthesiaRecord>> todayRecords() {
        return Result.ok(anesthesiaManagementService.todayRecords());
    }
}
