/*
 * 健澜科技 jlmedaios - 安全 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.security.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.security.entity.EncryptionKey;
import com.jlmedaios.monolith.security.service.SecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 安全 Controller。
 *
 * <p>国密算法预留，生产接 HSM 加密机</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/security")
public class SecurityController {

    private final SecurityService securityService;

    /**
     * 加密（mock SM4）。
     *
     * @param body {plainText}
     * @return Result<Map<String, Object>>
     */
    @PostMapping("/encrypt")
    public Result<Map<String, Object>> encrypt(@RequestBody Map<String, String> body) {
        String cipherText = securityService.encrypt(body.get("plainText"));
        Map<String, Object> result = new HashMap<>();
        result.put("algorithm", "SM4");
        result.put("cipherText", cipherText);
        return Result.ok(result);
    }

    /**
     * 解密（mock SM4）。
     *
     * @param body {cipherText}
     * @return Result<Map<String, Object>>
     */
    @PostMapping("/decrypt")
    public Result<Map<String, Object>> decrypt(@RequestBody Map<String, String> body) {
        String plainText = securityService.decrypt(body.get("cipherText"));
        Map<String, Object> result = new HashMap<>();
        result.put("algorithm", "SM4");
        result.put("plainText", plainText);
        return Result.ok(result);
    }

    /**
     * 哈希（mock SM3）。
     *
     * @param input 输入文本
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/hash")
    public Result<Map<String, Object>> hash(@RequestParam String input) {
        String hash = securityService.hash(input);
        Map<String, Object> result = new HashMap<>();
        result.put("algorithm", "SM3");
        result.put("hash", hash);
        return Result.ok(result);
    }

    /**
     * 活跃密钥列表。
     *
     * @return Result<List<EncryptionKey>>
     */
    @GetMapping("/key-status")
    public Result<List<EncryptionKey>> keyStatus() {
        return Result.ok(securityService.keyStatus());
    }
}
