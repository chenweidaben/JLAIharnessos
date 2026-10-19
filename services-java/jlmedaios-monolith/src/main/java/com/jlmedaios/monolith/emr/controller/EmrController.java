/*
 * 健澜科技 jlmedaios - 电子病历 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.emr.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.emr.entity.EmrDocument;
import com.jlmedaios.monolith.emr.service.EmrService;
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
 * 电子病历 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/emr")
public class EmrController {

    private final EmrService emrService;

    /**
     * 创建病历。
     *
     * @param body 病历请求体
     * @return Result<EmrDocument>
     */
    @PostMapping("/create")
    public Result<EmrDocument> create(@RequestBody Map<String, Object> body) {
        EmrDocument doc = emrService.create(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("visitType")),
                String.valueOf(body.get("deptCode")),
                String.valueOf(body.get("doctorId")),
                String.valueOf(body.get("mainDiagnosis")),
                String.valueOf(body.get("docType")),
                String.valueOf(body.get("contentText")),
                String.valueOf(body.get("prevHash"))
        );
        return Result.ok(doc);
    }

    /**
     * CA 签名。
     *
     * @param id   病历 ID
     * @param body {signBy}
     * @return Result<EmrDocument>
     */
    @PutMapping("/{id}/sign")
    public Result<EmrDocument> sign(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String signBy = body.get("signBy");
        return emrService.sign(id, signBy)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "病历不存在"));
    }

    /**
     * 按患者 ID 查询病历列表。
     *
     * @param patientId 患者 ID
     * @return Result<List<EmrDocument>>
     */
    @GetMapping("/patient/{patientId}")
    public Result<List<EmrDocument>> listByPatient(@PathVariable Long patientId) {
        return Result.ok(emrService.listByPatient(patientId));
    }

    /**
     * 校验 hash 链。
     *
     * @param id 病历 ID
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/{id}/verify")
    public Result<Map<String, Object>> verify(@PathVariable Long id) {
        return Result.ok(emrService.verify(id));
    }
}
