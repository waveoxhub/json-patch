// Basic types
export type PrimitiveType = 'string' | 'number' | 'boolean' | 'null';

// Object Schema
export type ObjectSchema = {
    readonly $type: 'object';
    readonly $fields: Record<string, FieldSchema>;
};

// Array object member Schema
export type ArrayItemObjectSchema = ObjectSchema & {
    readonly $pk: string; // Only objects in arrays have primary keys
};

// Array Schema
export type ArraySchema = {
    readonly $type: 'array';
    readonly $item: ArrayItemObjectSchema | { readonly $type: PrimitiveType };
};

// Object field Schema
export type FieldSchema =
    | { readonly $type: PrimitiveType }
    | { readonly $type: 'object'; readonly $fields: Record<string, FieldSchema> }
    | ArraySchema;

// Root Schema definition
export type Schema = ObjectSchema | ArraySchema;
