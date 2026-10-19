/*
 * 健澜科技 jlmedaios - 安全 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.security;

import com.jlmedaios.monolith.security.service.SecurityService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 安全 Service 测试。
 */
@SpringBootTest
public class SecurityServiceTest {

    @Autowired
    private SecurityService securityService;

    @Test
    void testEncrypt() {
        String cipherText = securityService.encrypt("hello world");
        assertNotNull(cipherText);
        assertTrue(cipherText.startsWith("SM4:"));
    }

    @Test
    void testDecrypt() {
        String plainText = "敏感数据123";
        String cipherText = securityService.encrypt(plainText);
        String decrypted = securityService.decrypt(cipherText);
        assertEquals(plainText, decrypted);
    }

    @Test
    void testHash() {
        String hash = securityService.hash("test input");
        assertNotNull(hash);
        assertTrue(hash.startsWith("SM3:"));
        assertTrue(hash.length() > 10);
    }
}
