/*
 * 健澜科技 jlmedaios - 电子签名 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.e_signature.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.e_signature.entity.DigitalSignature;
import com.jlmedaios.monolith.e_signature.service.ESignatureService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 电子签名 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/sign")
public class ESignatureController {

    private final ESignatureService eSignatureService;

    /**
     * 申请签名。
     *
     * @param body {signatureNo, businessType, businessId, signerId, hashValue}
     * @return Result<DigitalSignature>
     */
    @PostMapping("/apply")
    public Result<DigitalSignature> apply(@RequestBody Map<String, Object> body) {
        DigitalSignature signature = eSignatureService.apply(
                String.valueOf(body.get("signatureNo")),
                String.valueOf(body.get("businessType")),
                String.valueOf(body.get("businessId")),
                String.valueOf(body.get("signerId")),
                String.valueOf(body.get("hashValue"))
        );
        return Result.ok(signature);
    }

    /**
     * 验签。
     *
     * @param body {businessId, hashValue, signatureValue}
     * @return Result<Map<String, Object>>
     */
    @PostMapping("/verify")
    public Result<Map<String, Object>> verify(@RequestBody Map<String, Object> body) {
        return Result.ok(eSignatureService.verify(
                String.valueOf(body.get("businessId")),
                String.valueOf(body.get("hashValue")),
                String.valueOf(body.get("signatureValue"))
        ));
    }

    /**
     * 签名历史。
     *
     * @param businessId 业务 ID
     * @return Result<List<DigitalSignature>>
     */
    @GetMapping("/history/{businessId}")
    public Result<List<DigitalSignature>> history(@PathVariable String businessId) {
        return Result.ok(eSignatureService.history(businessId));
    }
}
