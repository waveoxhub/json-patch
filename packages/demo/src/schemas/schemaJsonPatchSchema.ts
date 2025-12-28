/**
 * JSON Schema 定义，用于验证 @waveox/schema-json-patch 的 Schema 结构
 * 为 Monaco Editor 提供智能提示和验证
 */
export const schemaJsonPatchSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Schema JSON Patch Schema',
    description: '用于定义 JSON 数据结构的 Schema，支持对象和数组类型',
    definitions: {
        primitiveType: {
            type: 'string',
            enum: ['string', 'number', 'boolean', 'null'],
            description: '基本数据类型',
        },
        primitiveField: {
            type: 'object',
            description: '基本类型字段',
            properties: {
                $type: { $ref: '#/definitions/primitiveType' },
            },
            required: ['$type'],
            additionalProperties: false,
        },
        objectField: {
            type: 'object',
            description: '嵌套对象字段',
            properties: {
                $type: { const: 'object', description: '类型标识' },
                $fields: {
                    type: 'object',
                    description: '对象的字段定义',
                    additionalProperties: { $ref: '#/definitions/fieldSchema' },
                },
                $split: {
                    type: 'boolean',
                    description: '启用时，add/replace 操作会拆分为细粒度操作',
                },
            },
            required: ['$type', '$fields'],
            additionalProperties: false,
        },
        arrayItemPrimitiveSchema: {
            type: 'object',
            description: '数组元素的基本类型定义',
            properties: {
                $type: { $ref: '#/definitions/primitiveType' },
            },
            required: ['$type'],
            additionalProperties: false,
        },
        arrayItemObjectSchema: {
            type: 'object',
            description: '数组元素的对象类型定义',
            properties: {
                $type: { const: 'object', description: '类型标识' },
                $fields: {
                    type: 'object',
                    description: '对象的字段定义',
                    additionalProperties: { $ref: '#/definitions/fieldSchema' },
                },
                $pk: {
                    type: 'string',
                    description: '主键字段名，用于唯一标识数组中的对象（不设置时使用索引）',
                },
                $ordered: {
                    type: 'boolean',
                    description: '是否追踪数组元素顺序，默认 true',
                },
                $split: {
                    type: 'boolean',
                    description: '启用时，add/replace 操作会拆分为细粒度操作',
                },
            },
            required: ['$type', '$fields'],
            additionalProperties: false,
        },
        arraySchema: {
            type: 'object',
            description: '数组类型定义',
            properties: {
                $type: { const: 'array', description: '类型标识' },
                $item: {
                    oneOf: [
                        { $ref: '#/definitions/arrayItemObjectSchema' },
                        { $ref: '#/definitions/arrayItemPrimitiveSchema' },
                    ],
                    description: '数组元素的类型定义',
                },
            },
            required: ['$type', '$item'],
            additionalProperties: false,
        },
        fieldSchema: {
            oneOf: [
                { $ref: '#/definitions/primitiveField' },
                { $ref: '#/definitions/objectField' },
                { $ref: '#/definitions/arraySchema' },
            ],
            description: '字段的类型定义',
        },
        objectSchema: {
            type: 'object',
            description: '根对象类型定义',
            properties: {
                $type: { const: 'object', description: '类型标识' },
                $fields: {
                    type: 'object',
                    description: '对象的字段定义',
                    additionalProperties: { $ref: '#/definitions/fieldSchema' },
                },
                $split: {
                    type: 'boolean',
                    description: '启用时，add/replace 操作会拆分为细粒度操作',
                },
            },
            required: ['$type', '$fields'],
            additionalProperties: false,
        },
    },
    oneOf: [{ $ref: '#/definitions/objectSchema' }, { $ref: '#/definitions/arraySchema' }],
};

/**
 * Schema JSON Schema 的 URI 标识
 */
export const SCHEMA_JSON_PATCH_SCHEMA_URI = 'http://waveox/schema-json-patch-schema.json';
