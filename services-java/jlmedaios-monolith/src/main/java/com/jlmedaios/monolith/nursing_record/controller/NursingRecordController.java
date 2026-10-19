/*
 * 健澜科技 jlmedaios - 护理记录 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing_record.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.nursing_record.entity.NursingRecord;
import com.jlmedaios.monolith.nursing_record.service.NursingRecordService;
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
 * 护理记录 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/nursing-record")
public class NursingRecordController {

    private final NursingRecordService nursingRecordService;

    /**
     * 创建护理记录。
     *
     * @param body {patientId, wardCode, recordType, contentText, nurseId}
     * @return Result<NursingRecord>
     */
    @PostMapping("/create")
    public Result<NursingRecord> create(@RequestBody Map<String, Object> body) {
        NursingRecord record = nursingRecordService.create(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("wardCode")),
                String.valueOf(body.get("recordType")),
                String.valueOf(body.get("contentText")),
                String.valueOf(body.get("nurseId"))
        );
        return Result.ok(record);
    }

    /**
     * 按患者 ID 查询护理记录列表。
     *
     * @param patientId 患者 ID
     * @return Result<List<NursingRecord>>
     */
    @GetMapping("/patient/{patientId}")
    public Result<List<NursingRecord>> listByPatient(@PathVariable Long patientId) {
        return Result.ok(nursingRecordService.listByPatient(patientId));
    }

    /**
     * 今日某病区护理记录。
     *
     * @param wardCode 病区编码
     * @return Result<List<NursingRecord>>
     */
    @GetMapping("/ward/{wardCode}/today")
    public Result<List<NursingRecord>> todayWard(@PathVariable String wardCode) {
        return Result.ok(nursingRecordService.todayWard(wardCode));
    }
}
