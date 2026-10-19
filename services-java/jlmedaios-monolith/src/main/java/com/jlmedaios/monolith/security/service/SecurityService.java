/*
 * 健澜科技 jlmedaios - 安全 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.security.service;

import com.jlmedaios.monolith.security.entity.EncryptionKey;
import com.jlmedaios.monolith.security.repository.EncryptionKeyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.List;

/**
 * 安全 Service。
 *
 * <p>国密算法预留，生产接 HSM 加密机</p>
 */
@Service
@RequiredArgsConstructor
public class SecurityService {

    private final EncryptionKeyRepository encryptionKeyRepository;

    /**
     * mock SM4 加密，返回 "SM4:" + base64(plainText)。
     * 生产接 HSM 加密机。
     *
     * @param plainText 明文
     * @return 密文（mock）
     */
    public String encrypt(String plainText) {
        String base64 = Base64.getEncoder()
                .encodeToString(plainText.getBytes(StandardCharsets.UTF_8));
        return "SM4:" + base64;
    }

    /**
     * mock SM4 解密。
     *
     * @param cipherText 密文（mock）
     * @return 明文
     */
    public String decrypt(String cipherText) {
        if (cipherText != null && cipherText.startsWith("SM4:")) {
            String base64 = cipherText.substring(4);
            byte[] decoded = Base64.getDecoder().decode(base64);
            return new String(decoded, StandardCharsets.UTF_8);
        }
        return cipherText;
    }

    /**
     * mock SM3 哈希，返回 "SM3:" + sha256(input)。
     * 注释标明：生产用真 SM3，当前 mock 用 SHA-256 替代。
     *
     * @param input 输入
     * @return 哈希值（mock）
     */
    public String hash(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                hexString.append(String.format("%02x", b));
            }
            return "SM3:" + hexString.toString();
        } catch (Exception e) {
            return "SM3:" + Integer.toHexString(input.hashCode());
        }
    }

    /**
     * 返回当前 active 密钥列表。
     *
     * @return 活跃密钥列表
     */
    public List<EncryptionKey> keyStatus() {
        return encryptionKeyRepository.findByStatus("ACTIVE");
    }
}
