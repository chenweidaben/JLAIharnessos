/*
 * 健澜科技 jlmedaios - 血透工作站 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.blood_dialysis.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.blood_dialysis.entity.DialysisSession;
import com.jlmedaios.monolith.blood_dialysis.service.BloodDialysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 血透工作站 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dialysis")
public class BloodDialysisController {

    private final BloodDialysisService bloodDialysisService;

    /**
     * 今日透析安排。
     *
     * @return Result<List<DialysisSession>>
     */
    @GetMapping("/today")
    public Result<List<DialysisSession>> todaySchedule() {
        return Result.ok(bloodDialysisService.todaySchedule());
    }

    /**
     * 开始透析。
     *
     * @param sessionNo 透析场次编号
     * @return Result<DialysisSession>
     */
    @PutMapping("/{sessionNo}/start")
    public Result<DialysisSession> startDialysis(@PathVariable String sessionNo) {
        return Result.ok(bloodDialysisService.startDialysis(sessionNo));
    }

    /**
     * 结束透析。
     *
     * @param sessionNo 透析场次编号
     * @param body      {actualWeight, ultrafiltration, postWeight}
     * @return Result<DialysisSession>
     */
    @PutMapping("/{sessionNo}/end")
    public Result<DialysisSession> endDialysis(@PathVariable String sessionNo,
                                                @RequestBody Map<String, Object> body) {
        DialysisSession session = bloodDialysisService.endDialysis(
                sessionNo,
                new BigDecimal(String.valueOf(body.get("actualWeight"))),
                new BigDecimal(String.valueOf(body.get("ultrafiltration"))),
                new BigDecimal(String.valueOf(body.get("postWeight")))
        );
        return Result.ok(session);
    }

    /**
     * 患者透析历史。
     *
     * @param patientId 患者 ID
     * @return Result<List<DialysisSession>>
     */
    @GetMapping("/{patientId}/history")
    public Result<List<DialysisSession>> dialysisHistory(@PathVariable Long patientId) {
        return Result.ok(bloodDialysisService.dialysisHistory(patientId));
    }
}
