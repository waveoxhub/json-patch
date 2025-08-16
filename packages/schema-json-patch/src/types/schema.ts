// 基本类型
export type PrimitiveType = 'string' | 'number' | 'boolean' | 'null';

// 对象模式
export type ObjectSchema = {
    readonly $type: 'object';
    readonly $fields: Record<string, FieldSchema>;
};

// 数组对象成员模式
export type ArrayItemObjectSchema = ObjectSchema & {
    readonly $pk: string; // 只有数组中的对象有主键
};

// 数组模式
export type ArraySchema = {
    readonly $type: 'array';
    readonly $item: ArrayItemObjectSchema | { readonly $type: PrimitiveType };
};

// 对象字段模式
export type FieldSchema =
    | { readonly $type: PrimitiveType }
    | { readonly $type: 'object'; readonly $fields: Record<string, FieldSchema> }
    | ArraySchema;

// 根模式定义
export type Schema = ObjectSchema | ArraySchema;
