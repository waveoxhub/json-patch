/**
 * JSON Schema 定义，用于验证 @waveox/schema-json-patch 的 Schema 结构
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
                    description: '类型，可选值：string | number | boolean | object | array',
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
                    description: '类型，可选值：string | number | boolean | object | array',
                },
                $fields: {
                    type: 'object',
                    description: '对象的字段',
                    additionalProperties: { $ref: '#/definitions/fieldSchema' },
                },
                $split: {
                    type: 'boolean',
                    description: '启用后生成细粒度补丁，便于逐一审查，默认 false',
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
                    description: '类型，可选值：string | number | boolean | object | array',
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
                    description: '类型，可选值：string | number | boolean | object | array',
                },
                $fields: {
                    type: 'object',
                    description: '对象的字段',
                    additionalProperties: { $ref: '#/definitions/fieldSchema' },
                },
                $pk: {
                    type: 'string',
                    description: '主键字段名（如 "id"），用于唯一标识元素；不设置则按索引匹配',
                },
                $ordered: {
                    type: 'boolean',
                    description: '是否追踪顺序变化，默认 true',
                },
                $split: {
                    type: 'boolean',
                    description: '启用后生成细粒度补丁，默认 false',
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
                    description: '类型，可选值：string | number | boolean | object | array',
                },
                $item: {
                    oneOf: [
                        { $ref: '#/definitions/arrayItemObjectSchema' },
                        { $ref: '#/definitions/arrayItemPrimitiveSchema' },
                    ],
                    description: '数组的成员',
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
                    description: '类型，可选值：object | array（根结构类型）',
                },
                $fields: {
                    type: 'object',
                    description: '对象的字段',
                    additionalProperties: { $ref: '#/definitions/fieldSchema' },
                },
                $split: {
                    type: 'boolean',
                    description: '启用后生成细粒度补丁，默认 false',
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
                    description: '类型，可选值：object | array（根结构类型）',
                },
                $item: {
                    oneOf: [
                        { $ref: '#/definitions/arrayItemObjectSchema' },
                        { $ref: '#/definitions/arrayItemPrimitiveSchema' },
                    ],
                    description: '数组的成员',
                },
            },
            required: ['$type', '$item'],
            additionalProperties: false,
        },
    },

    oneOf: [{ $ref: '#/definitions/rootObjectSchema' }, { $ref: '#/definitions/rootArraySchema' }],
};

export const SCHEMA_JSON_PATCH_SCHEMA_URI = 'http://waveox/schema-json-patch-schema.json';
