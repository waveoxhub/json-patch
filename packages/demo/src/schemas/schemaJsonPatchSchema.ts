// 共享的 description 常量，便于统一维护
const DESC = {
    TYPE_ALL: '类型，可选值：string | number | boolean | object | array',
    TYPE_ROOT: '类型，可选值：object | array（根结构类型）',
    FIELDS: '对象的字段',
    SPLIT: '启用后生成细粒度补丁，便于逐一审查，默认 false',
    PK: '主键字段名（如 "id"），用于唯一标识元素；不设置则按索引匹配',
    ORDERED: '是否追踪顺序变化，默认 true',
    ITEM: '数组的成员',
} as const;

/**
 * JSON Schema 定义
 * 为 Monaco Editor 提供智能提示和验证
 */
export const schemaJsonPatchSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Schema JSON Patch 配置',
    definitions: {
        // 所有可用的类型
        allTypes: {
            type: 'string',
            enum: ['string', 'number', 'boolean', 'null', 'object', 'array'],
        },

        primitiveType: {
            type: 'string',
            enum: ['string', 'number', 'boolean'],
        },

        primitiveFieldSchema: {
            type: 'object',
            properties: {
                $type: {
                    $ref: '#/definitions/primitiveType',
                    description: DESC.TYPE_ALL,
                },
            },
            required: ['$type'],
            additionalProperties: false,
        },

        nestedObjectFieldSchema: {
            type: 'object',
            properties: {
                $type: {
                    const: 'object',
                    description: DESC.TYPE_ALL,
                },
                $fields: {
                    type: 'object',
                    description: DESC.FIELDS,
                    additionalProperties: { $ref: '#/definitions/fieldSchema' },
                },
                $split: {
                    type: 'boolean',
                    description: DESC.SPLIT,
                },
            },
            required: ['$type', '$fields'],
            additionalProperties: false,
        },

        arrayItemPrimitiveSchema: {
            type: 'object',
            properties: {
                $type: {
                    $ref: '#/definitions/primitiveType',
                    description: DESC.TYPE_ALL,
                },
            },
            required: ['$type'],
            additionalProperties: false,
        },

        arrayItemObjectSchema: {
            type: 'object',
            properties: {
                $type: {
                    const: 'object',
                    description: DESC.TYPE_ALL,
                },
                $fields: {
                    type: 'object',
                    description: DESC.FIELDS,
                    additionalProperties: { $ref: '#/definitions/fieldSchema' },
                },
                $pk: {
                    type: 'string',
                    description: DESC.PK,
                },
                $ordered: {
                    type: 'boolean',
                    description: DESC.ORDERED,
                },
                $split: {
                    type: 'boolean',
                    description: DESC.SPLIT,
                },
            },
            required: ['$type', '$fields'],
            additionalProperties: false,
        },

        arraySchema: {
            type: 'object',
            properties: {
                $type: {
                    const: 'array',
                    description: DESC.TYPE_ALL,
                },
                $item: {
                    oneOf: [
                        { $ref: '#/definitions/arrayItemObjectSchema' },
                        { $ref: '#/definitions/arrayItemPrimitiveSchema' },
                    ],
                    description: DESC.ITEM,
                },
            },
            required: ['$type', '$item'],
            additionalProperties: false,
        },

        fieldSchema: {
            description: '字段定义',
            oneOf: [
                { $ref: '#/definitions/primitiveFieldSchema' },
                { $ref: '#/definitions/nestedObjectFieldSchema' },
                { $ref: '#/definitions/arraySchema' },
            ],
        },

        rootObjectSchema: {
            type: 'object',
            properties: {
                $type: {
                    const: 'object',
                    description: DESC.TYPE_ROOT,
                },
                $fields: {
                    type: 'object',
                    description: DESC.FIELDS,
                    additionalProperties: { $ref: '#/definitions/fieldSchema' },
                },
                $split: {
                    type: 'boolean',
                    description: DESC.SPLIT,
                },
            },
            required: ['$type', '$fields'],
            additionalProperties: false,
        },

        rootArraySchema: {
            type: 'object',
            properties: {
                $type: {
                    const: 'array',
                    description: DESC.TYPE_ROOT,
                },
                $item: {
                    oneOf: [
                        { $ref: '#/definitions/arrayItemObjectSchema' },
                        { $ref: '#/definitions/arrayItemPrimitiveSchema' },
                    ],
                    description: DESC.ITEM,
                },
            },
            required: ['$type', '$item'],
            additionalProperties: false,
        },
    },

    oneOf: [{ $ref: '#/definitions/rootObjectSchema' }, { $ref: '#/definitions/rootArraySchema' }],
};

export const SCHEMA_JSON_PATCH_SCHEMA_URI = 'http://waveox/schema-json-patch-schema.json';
