/*
 * 健澜科技 jlmedaios - 手术 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.surgery.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.surgery.entity.SurgeryRecord;
import com.jlmedaios.monolith.surgery.service.SurgeryService;
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
 * 手术 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/surgery")
public class SurgeryController {

    private final SurgeryService surgeryService;

    /**
     * 排手术。
     *
     * @param body {patientId, surgeryName, doctorName, anesthesiologist}
     * @return Result<SurgeryRecord>
     */
    @PostMapping("/schedule")
    public Result<SurgeryRecord> schedule(@RequestBody Map<String, Object> body) {
        SurgeryRecord record = surgeryService.schedule(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("surgeryName")),
                String.valueOf(body.get("doctorName")),
                String.valueOf(body.get("anesthesiologist"))
        );
        return Result.ok(record);
    }

    /**
     * 开始手术。
     *
     * @param id 手术记录 ID
     * @return Result<SurgeryRecord>
     */
    @PutMapping("/{id}/start")
    public Result<SurgeryRecord> start(@PathVariable Long id) {
        return surgeryService.start(id)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "手术记录不存在"));
    }

    /**
     * 完成手术。
     *
     * @param id 手术记录 ID
     * @return Result<SurgeryRecord>
     */
    @PutMapping("/{id}/finish")
    public Result<SurgeryRecord> finish(@PathVariable Long id) {
        return surgeryService.finish(id)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "手术记录不存在"));
    }

    /**
     * 查今日手术列表。
     *
     * @return Result<List<SurgeryRecord>>
     */
    @GetMapping("/today")
    public Result<List<SurgeryRecord>> today() {
        return Result.ok(surgeryService.today());
    }
}
