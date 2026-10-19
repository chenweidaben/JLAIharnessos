/*
 * 健澜科技 jlmedaios - 手术高级 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.surgery_advanced.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.surgery_advanced.entity.SurgeryRecord;
import com.jlmedaios.monolith.surgery_advanced.entity.SurgerySchedule;
import com.jlmedaios.monolith.surgery_advanced.service.SurgeryAdvancedService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 手术高级 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/surgery")
public class SurgeryAdvancedController {

    private final SurgeryAdvancedService surgeryAdvancedService;

    /**
     * 创建手术排台。
     *
     * @param body {scheduleNo, patientId, surgeryName, surgeon, anesthesiologist, surgeryRoom, scheduledStart, scheduledEnd, priority}
     * @return Result<SurgerySchedule>
     */
    @PostMapping("/schedule")
    public Result<SurgerySchedule> createSchedule(@RequestBody Map<String, Object> body) {
        SurgerySchedule schedule = surgeryAdvancedService.createSchedule(
                String.valueOf(body.get("scheduleNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("surgeryName")),
                String.valueOf(body.get("surgeon")),
                String.valueOf(body.get("anesthesiologist")),
                String.valueOf(body.get("surgeryRoom")),
                LocalDateTime.parse(String.valueOf(body.get("scheduledStart"))),
                LocalDateTime.parse(String.valueOf(body.get("scheduledEnd"))),
                String.valueOf(body.get("priority"))
        );
        return Result.ok(schedule);
    }

    /**
     * 开始手术。
     *
     * @param id 排台 ID
     * @return Result<SurgerySchedule>
     */
    @PutMapping("/schedule/{id}/start")
    public Result<SurgerySchedule> startSurgery(@PathVariable Long id) {
        return surgeryAdvancedService.startSurgery(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 完成手术。
     *
     * @param id   排台 ID
     * @param body {preOpDiagnosis, postOpDiagnosis, surgeryDescription, bleedingAmount, transfusion, complications}
     * @return Result<SurgeryRecord>
     */
    @PutMapping("/schedule/{id}/finish")
    public Result<SurgeryRecord> finishSurgery(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return surgeryAdvancedService.finishSurgery(
                id,
                String.valueOf(body.get("preOpDiagnosis")),
                String.valueOf(body.get("postOpDiagnosis")),
                String.valueOf(body.get("surgeryDescription")),
                new BigDecimal(String.valueOf(body.get("bleedingAmount"))),
                String.valueOf(body.get("transfusion")),
                String.valueOf(body.get("complications"))
        ).map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 今日手术安排。
     *
     * @return Result<List<SurgerySchedule>>
     */
    @GetMapping("/today")
    public Result<List<SurgerySchedule>> todaySchedule() {
        return Result.ok(surgeryAdvancedService.todaySchedule());
    }
}
