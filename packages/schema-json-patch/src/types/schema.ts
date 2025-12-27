/**
 * 基本类型
 */
export type PrimitiveType = 'string' | 'number' | 'boolean' | 'null';

/**
 * 对象模式
 */
export type ObjectSchema = {
    readonly $type: 'object';
    /** 字段定义 */
    readonly $fields: Record<string, FieldSchema>;
    /** 启用时，add/replace 操作会拆分为细粒度操作 */
    readonly $split?: boolean;
};

/**
 * 数组对象成员模式
 * 用于定义数组中对象元素的结构
 */
export type ArrayItemObjectSchema = ObjectSchema & {
    /** 主键字段名，用于唯一标识数组中的对象 */
    readonly $pk: string;
};

/**
 * 数组模式
 */
export type ArraySchema = {
    readonly $type: 'array';
    /** 数组元素的模式定义 */
    readonly $item: ArrayItemObjectSchema | { readonly $type: PrimitiveType };
};

/**
 * 对象字段模式
 * 可以是基本类型、嵌套对象或数组
 */
export type FieldSchema =
    | { readonly $type: PrimitiveType }
    | {
          readonly $type: 'object';
          readonly $fields: Record<string, FieldSchema>;
          readonly $split?: boolean;
      }
    | ArraySchema;

/**
 * 根模式定义
 * 数据结构的顶层 Schema，可以是对象或数组
 */
export type Schema = ObjectSchema | ArraySchema;
