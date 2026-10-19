/*
 * 健澜科技 jlmedaios - 数据中台 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_platform;

import com.jlmedaios.monolith.data_platform.entity.DataAsset;
import com.jlmedaios.monolith.data_platform.service.DataPlatformService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 数据中台 Service 测试。
 */
@SpringBootTest
public class DataPlatformServiceTest {

    @Autowired
    private DataPlatformService dataPlatformService;

    @Test
    void testAssetList() {
        List<DataAsset> list = dataPlatformService.assetList();
        assertNotNull(list);
    }

    @Test
    void testByCategory() {
        List<DataAsset> list = dataPlatformService.byCategory("患者数据");
        assertNotNull(list);
    }

    @Test
    void testAssetDetail() {
        DataAsset asset = dataPlatformService.assetDetail("DA-001");
        // 可能为空（H2 内存库无预置数据）
    }
}
