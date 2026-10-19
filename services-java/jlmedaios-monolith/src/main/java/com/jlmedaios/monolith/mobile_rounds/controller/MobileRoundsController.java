/*
 * 健澜科技 jlmedaios - 移动查房 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.mobile_rounds.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.mobile_rounds.entity.RoundRecord;
import com.jlmedaios.monolith.mobile_rounds.service.MobileRoundsService;
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
 * 移动查房 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rounds")
public class MobileRoundsController {

    private final MobileRoundsService mobileRoundsService;

    /**
     * 创建查房记录。
     *
     * @param body {patientId, wardCode, doctorId, roundType, findings, plan}
     * @return Result<RoundRecord>
     */
    @PostMapping("/create")
    public Result<RoundRecord> create(@RequestBody Map<String, Object> body) {
        RoundRecord record = mobileRoundsService.create(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("wardCode")),
                String.valueOf(body.get("doctorId")),
                String.valueOf(body.get("roundType")),
                String.valueOf(body.get("findings")),
                String.valueOf(body.get("plan"))
        );
        return Result.ok(record);
    }

    /**
     * 今日某病区查房记录。
     *
     * @param wardCode 病区编码
     * @return Result<List<RoundRecord>>
     */
    @GetMapping("/ward/{wardCode}/today")
    public Result<List<RoundRecord>> todayWard(@PathVariable String wardCode) {
        return Result.ok(mobileRoundsService.todayWard(wardCode));
    }

    /**
     * 患者查房历史。
     *
     * @param patientId 患者 ID
     * @return Result<List<RoundRecord>>
     */
    @GetMapping("/patient/{patientId}")
    public Result<List<RoundRecord>> patientHistory(@PathVariable Long patientId) {
        return Result.ok(mobileRoundsService.patientHistory(patientId));
    }
}
