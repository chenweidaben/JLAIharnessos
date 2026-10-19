/*
 * 健澜科技 jlmedaios - ICU 工作站 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.icu_workstation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.icu_workstation.entity.ICURecord;
import com.jlmedaios.monolith.icu_workstation.entity.ICUWorkItem;
import com.jlmedaios.monolith.icu_workstation.service.IcuWorkstationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * ICU 工作站 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/icu")
public class IcuWorkstationController {

    private final IcuWorkstationService icuWorkstationService;

    /**
     * 今日 ICU 患者列表。
     *
     * @return Result<List<ICURecord>>
     */
    @GetMapping("/today")
    public Result<List<ICURecord>> todayPatients() {
        return Result.ok(icuWorkstationService.todayPatients());
    }

    /**
     * 记录 ICU 监护数据。
     *
     * @param body {recordNo, patientId, bedNumber, vitalsJSON, vasopressor, ventilatorSettings}
     * @return Result<ICURecord>
     */
    @PostMapping("/record")
    public Result<ICURecord> recordMonitoring(@RequestBody Map<String, Object> body) {
        ICURecord record = icuWorkstationService.recordMonitoring(
                String.valueOf(body.get("recordNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("bedNumber")),
                String.valueOf(body.get("vitalsJSON")),
                String.valueOf(body.get("vasopressor")),
                String.valueOf(body.get("ventilatorSettings"))
        );
        return Result.ok(record);
    }

    /**
     * 患者生命体征趋势。
     *
     * @param patientId 患者 ID
     * @return Result<List<ICURecord>>
     */
    @GetMapping("/{patientId}/trend")
    public Result<List<ICURecord>> vitalTrend(@PathVariable Long patientId) {
        return Result.ok(icuWorkstationService.vitalTrend(patientId));
    }

    /**
     * 记录审核。
     *
     * @param recordNo 记录编号
     * @return Result<ICURecord>
     */
    @PutMapping("/{recordNo}/review")
    public Result<ICURecord> reviewRecord(@PathVariable String recordNo) {
        return Result.ok(icuWorkstationService.reviewRecord(recordNo));
    }

    // ==================== ICU 床位+评分管理（深化） ====================

    /**
     * ICU 床位状态。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/bed-status")
    public Result<Map<String, Object>> bedStatus() {
        return Result.ok(icuWorkstationService.bedStatus());
    }

    /**
     * 更新评分。
     *
     * @param workItemNo 工作项编号
     * @param body       {sofaScore, gcsScore}
     * @return Result<ICUWorkItem>
     */
    @PutMapping("/{workItemNo}/score")
    public Result<ICUWorkItem> updateScore(@PathVariable String workItemNo,
                                            @RequestBody Map<String, Object> body) {
        ICUWorkItem item = icuWorkstationService.updateScore(
                workItemNo,
                new BigDecimal(String.valueOf(body.get("sofaScore"))),
                Integer.valueOf(String.valueOf(body.get("gcsScore")))
        );
        return Result.ok(item);
    }

    /**
     * 生命体征趋势（按工作项）。
     *
     * @param workItemNo 工作项编号
     * @return Result<List<ICURecord>>
     */
    @GetMapping("/{workItemNo}/trend")
    public Result<List<ICURecord>> vitalTrendByWorkItem(@PathVariable String workItemNo) {
        return Result.ok(icuWorkstationService.vitalTrendByWorkItem(workItemNo));
    }

    /**
     * 转出 ICU。
     *
     * @param workItemNo 工作项编号
     * @return Result<ICUWorkItem>
     */
    @PutMapping("/{workItemNo}/discharge")
    public Result<ICUWorkItem> dischargeICU(@PathVariable String workItemNo) {
        return Result.ok(icuWorkstationService.dischargeICU(workItemNo));
    }
}
