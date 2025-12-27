/**
 * 错误码枚举
 * 用于标识不同类型的错误
 */
export enum ErrorCode {
    /** 无效的 JSON 路径格式 */
    INVALID_PATH = 'INVALID_PATH',
    /** Schema 与数据类型不匹配 */
    SCHEMA_MISMATCH = 'SCHEMA_MISMATCH',
    /** 缺少必需的主键字段 */
    MISSING_PRIMARY_KEY = 'MISSING_PRIMARY_KEY',
    /** 不支持的操作类型 */
    UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',
    /** 无效的 JSON 字符串 */
    INVALID_JSON = 'INVALID_JSON',
    /** 无效的 Schema 定义 */
    INVALID_SCHEMA = 'INVALID_SCHEMA',
    /** 补丁应用失败 */
    PATCH_APPLICATION_FAILED = 'PATCH_APPLICATION_FAILED',
    /** 哈希生成失败 */
    HASH_GENERATION_FAILED = 'HASH_GENERATION_FAILED',
}

/**
 * Schema JSON Patch 库的自定义错误类
 * 提供结构化的错误信息，包含错误码和可选的路径信息
 */
export class SchemaJsonPatchError extends Error {
    /**
     * 创建一个 SchemaJsonPatchError 实例
     * @param code - 错误码
     * @param message - 错误消息
     * @param path - 可选的相关路径
     */
    constructor(
        public readonly code: ErrorCode,
        message: string,
        public readonly path?: string
    ) {
        super(path ? `[${code}] ${message} (path: ${path})` : `[${code}] ${message}`);
        this.name = 'SchemaJsonPatchError';
        // 维护正确的原型链（TypeScript 编译到 ES5 时需要）
        Object.setPrototypeOf(this, SchemaJsonPatchError.prototype);
    }

    /**
     * 创建一个无效路径错误
     */
    static invalidPath(path: string, detail?: string): SchemaJsonPatchError {
        return new SchemaJsonPatchError(
            ErrorCode.INVALID_PATH,
            detail || 'Invalid JSON path format',
            path
        );
    }

    /**
     * 创建一个 Schema 不匹配错误
     */
    static schemaMismatch(expected: string, actual: string, path?: string): SchemaJsonPatchError {
        return new SchemaJsonPatchError(
            ErrorCode.SCHEMA_MISMATCH,
            `Expected ${expected}, but found ${actual}`,
            path
        );
    }

    /**
     * 创建一个缺少主键错误
     */
    static missingPrimaryKey(pkField: string, path?: string): SchemaJsonPatchError {
        return new SchemaJsonPatchError(
            ErrorCode.MISSING_PRIMARY_KEY,
            `Object missing primary key field: ${pkField}`,
            path
        );
    }

    /**
     * 创建一个不支持操作错误
     */
    static unsupportedOperation(operation: string): SchemaJsonPatchError {
        return new SchemaJsonPatchError(
            ErrorCode.UNSUPPORTED_OPERATION,
            `Unsupported operation: ${operation}`
        );
    }

    /**
     * 创建一个无效 JSON 错误
     */
    static invalidJson(detail?: string): SchemaJsonPatchError {
        return new SchemaJsonPatchError(ErrorCode.INVALID_JSON, detail || 'Invalid JSON string');
    }

    /**
     * 创建一个无效 Schema 错误
     */
    static invalidSchema(detail: string): SchemaJsonPatchError {
        return new SchemaJsonPatchError(ErrorCode.INVALID_SCHEMA, detail);
    }
}
