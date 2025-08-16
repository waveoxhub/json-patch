/**
 * 本地存储管理工具
 */

// 防抖延迟时间（毫秒）
const DEBOUNCE_DELAY = 500;

// 存储键名常量
const STORAGE_KEYS = {
    SOURCE_JSON: 'schema-json-patch:source-json',
    TARGET_JSONS: 'schema-json-patch:target-jsons',
    SCHEMA_STRING: 'schema-json-patch:schema-string',
    ACTIVE_TAB: 'schema-json-patch:active-tab',
    ACTIVE_TARGET_INDEX: 'schema-json-patch:active-target-index',
} as const;

// 存储数据接口
export interface StoredData {
    sourceJson: string;
    targetJsons: string[];
    schemaString: string;
    activeTab: string;
    activeTargetIndex: number;
    lastSaved: number;
}

// 防抖保存函数
let saveTimeout: NodeJS.Timeout | null = null;

/**
 * 从localStorage读取数据
 */
export const loadFromStorage = (): Partial<StoredData> => {
    try {
        const data: Partial<StoredData> = {};
        
        // 读取源JSON
        const sourceJson = localStorage.getItem(STORAGE_KEYS.SOURCE_JSON);
        if (sourceJson) data.sourceJson = sourceJson;
        
        // 读取目标JSON列表
        const targetJsons = localStorage.getItem(STORAGE_KEYS.TARGET_JSONS);
        if (targetJsons) {
            try {
                data.targetJsons = JSON.parse(targetJsons);
            } catch {
                data.targetJsons = [''];
            }
        }
        
        // 读取Schema字符串
        const schemaString = localStorage.getItem(STORAGE_KEYS.SCHEMA_STRING);
        if (schemaString) data.schemaString = schemaString;
        
        // 读取当前标签页
        const activeTab = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
        if (activeTab) data.activeTab = activeTab;
        
        // 读取当前目标索引
        const activeTargetIndex = localStorage.getItem(STORAGE_KEYS.ACTIVE_TARGET_INDEX);
        if (activeTargetIndex) {
            data.activeTargetIndex = parseInt(activeTargetIndex, 10);
        }
        
        return data;
    } catch (error) {
        console.warn('从localStorage读取数据失败:', error);
        return {};
    }
};

/**
 * 保存数据到localStorage（防抖版本）
 */
export const saveToStorage = (data: Partial<StoredData>): void => {
    // 清除之前的定时器
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    
    // 设置新的定时器
    saveTimeout = setTimeout(() => {
        try {
            const timestamp = Date.now();
            
            // 保存源JSON
            if (data.sourceJson !== undefined) {
                localStorage.setItem(STORAGE_KEYS.SOURCE_JSON, data.sourceJson);
            }
            
            // 保存目标JSON列表
            if (data.targetJsons !== undefined) {
                localStorage.setItem(STORAGE_KEYS.TARGET_JSONS, JSON.stringify(data.targetJsons));
            }
            
            // 保存Schema字符串
            if (data.schemaString !== undefined) {
                localStorage.setItem(STORAGE_KEYS.SCHEMA_STRING, data.schemaString);
            }
            
            // 保存当前标签页
            if (data.activeTab !== undefined) {
                localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, data.activeTab);
            }
            
            // 保存当前目标索引
            if (data.activeTargetIndex !== undefined) {
                localStorage.setItem(STORAGE_KEYS.ACTIVE_TARGET_INDEX, data.activeTargetIndex.toString());
            }
            
            // 保存时间戳
            localStorage.setItem('schema-json-patch:last-saved', timestamp.toString());
        } catch (error) {
            console.warn('保存数据到localStorage失败:', error);
        }
    }, DEBOUNCE_DELAY);
};

/**
 * 立即保存数据到localStorage（无防抖）
 */
export const saveToStorageImmediate = (data: Partial<StoredData>): void => {
    try {
        const timestamp = Date.now();
        
        // 保存源JSON
        if (data.sourceJson !== undefined) {
            localStorage.setItem(STORAGE_KEYS.SOURCE_JSON, data.sourceJson);
        }
        
        // 保存目标JSON列表
        if (data.targetJsons !== undefined) {
            localStorage.setItem(STORAGE_KEYS.TARGET_JSONS, JSON.stringify(data.targetJsons));
        }
        
        // 保存Schema字符串
        if (data.schemaString !== undefined) {
            localStorage.setItem(STORAGE_KEYS.SCHEMA_STRING, data.schemaString);
        }
        
        // 保存当前标签页
        if (data.activeTab !== undefined) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, data.activeTab);
        }
        
        // 保存当前目标索引
        if (data.activeTargetIndex !== undefined) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_TARGET_INDEX, data.activeTargetIndex.toString());
        }
        
        // 保存时间戳
        localStorage.setItem('schema-json-patch:last-saved', timestamp.toString());
    } catch (error) {
        console.warn('保存数据到localStorage失败:', error);
    }
};

/**
 * 清除所有存储的数据
 */
export const clearStorage = (): void => {
    try {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        localStorage.removeItem('schema-json-patch:last-saved');
    } catch (error) {
        console.warn('清除localStorage数据失败:', error);
    }
};

/**
 * 检查是否有保存的数据
 */
export const hasStoredData = (): boolean => {
    try {
        return Object.values(STORAGE_KEYS).some(key => 
            localStorage.getItem(key) !== null
        );
    } catch {
        return false;
    }
};

/**
 * 获取最后保存时间
 */
export const getLastSavedTime = (): Date | null => {
    try {
        const timestamp = localStorage.getItem('schema-json-patch:last-saved');
        return timestamp ? new Date(parseInt(timestamp, 10)) : null;
    } catch {
        return null;
    }
};
