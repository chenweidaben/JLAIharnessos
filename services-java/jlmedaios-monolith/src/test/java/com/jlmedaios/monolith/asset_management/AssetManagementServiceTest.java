/*
 * 健澜科技 jlmedaios - 固定资产管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.asset_management;

import com.jlmedaios.monolith.asset_management.service.AssetManagementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 固定资产管理 Service 测试。
 */
@SpringBootTest
public class AssetManagementServiceTest {

    @Autowired
    private AssetManagementService service;

    @Test
    void testAssetListNotNull() {
        assertNotNull(service.assetList());
    }

    @Test
    void testTransferNotFound() {
        assertTrue(service.transfer("不存在资产", "新科室", "新位置").isEmpty());
    }

    @Test
    void testScrapNotFound() {
        assertTrue(service.scrap("不存在资产").isEmpty());
    }
}
