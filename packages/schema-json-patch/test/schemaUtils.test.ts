import { describe, it, expect } from 'vitest';
import {
    isObject,
    hasObjectItems,
    getPrimaryKeyField,
    assertArrayObjectHasPkIfObjectArray,
    getSchemaForPath,
} from '../src/utils/schemaUtils';
import { Schema, ArraySchema } from '../src/types/schema';
import { SchemaJsonPatchError } from '../src/errors';

describe('schemaUtils', () => {
    describe('isObject', () => {
        it('should return true for plain objects', () => {
            expect(isObject({})).toBe(true);
            expect(isObject({ name: 'test' })).toBe(true);
        });

        it('should return false for arrays', () => {
            expect(isObject([])).toBe(false);
            expect(isObject([1, 2, 3])).toBe(false);
        });

        it('should return false for null', () => {
            expect(isObject(null)).toBe(false);
        });

        it('should return false for primitives', () => {
            expect(isObject('string')).toBe(false);
            expect(isObject(123)).toBe(false);
            expect(isObject(true)).toBe(false);
            expect(isObject(undefined)).toBe(false);
        });
    });

    describe('hasObjectItems', () => {
        it('should return true for array schema with object items and $pk', () => {
            const schema: ArraySchema = {
                $type: 'array',
                $item: { $type: 'object', $pk: 'id', $fields: {} },
            };
            expect(hasObjectItems(schema)).toBe(true);
        });

        it('should return false for array schema with primitive items', () => {
            const schema: ArraySchema = {
                $type: 'array',
                $item: { $type: 'string' },
            };
            expect(hasObjectItems(schema)).toBe(false);
        });

        it('should return false for object items without $pk', () => {
            const schema: ArraySchema = {
                $type: 'array',
                $item: { $type: 'object', $fields: {} } as any,
            };
            expect(hasObjectItems(schema)).toBe(false);
        });
    });

    describe('getPrimaryKeyField', () => {
        it('should return pk field name for valid schema', () => {
            const schema: ArraySchema = {
                $type: 'array',
                $item: { $type: 'object', $pk: 'userId', $fields: {} },
            };
            expect(getPrimaryKeyField(schema)).toBe('userId');
        });

        it('should throw SchemaJsonPatchError for invalid schema', () => {
            const invalidSchema = { $type: 'object', $fields: {} } as any;
            expect(() => getPrimaryKeyField(invalidSchema)).toThrow(SchemaJsonPatchError);
        });

        it('should throw SchemaJsonPatchError for array without object items', () => {
            const schema: ArraySchema = {
                $type: 'array',
                $item: { $type: 'string' },
            };
            expect(() => getPrimaryKeyField(schema)).toThrow(SchemaJsonPatchError);
        });
    });

    describe('assertArrayObjectHasPkIfObjectArray', () => {
        it('should not throw for array with object items and $pk', () => {
            const schema: ArraySchema = {
                $type: 'array',
                $item: { $type: 'object', $pk: 'id', $fields: {} },
            };
            expect(() => assertArrayObjectHasPkIfObjectArray(schema)).not.toThrow();
        });

        it('should not throw for array with primitive items', () => {
            const schema: ArraySchema = {
                $type: 'array',
                $item: { $type: 'string' },
            };
            expect(() => assertArrayObjectHasPkIfObjectArray(schema)).not.toThrow();
        });

        it('should throw for object array without $pk', () => {
            const schema: ArraySchema = {
                $type: 'array',
                $item: { $type: 'object', $fields: {} } as any,
            };
            expect(() => assertArrayObjectHasPkIfObjectArray(schema)).toThrow();
        });
    });

    describe('getSchemaForPath', () => {
        const testSchema: Schema = {
            $type: 'object',
            $fields: {
                name: { $type: 'string' },
                profile: {
                    $type: 'object',
                    $fields: {
                        age: { $type: 'number' },
                    },
                },
                items: {
                    $type: 'array',
                    $item: { $type: 'object', $pk: 'id', $fields: { id: { $type: 'string' } } },
                },
            },
        };

        it('should return root schema for empty path', () => {
            expect(getSchemaForPath(testSchema, [])).toBe(testSchema);
        });

        it('should return field schema for single component', () => {
            const result = getSchemaForPath(testSchema, ['name']);
            expect(result?.$type).toBe('string');
        });

        it('should return nested field schema', () => {
            const result = getSchemaForPath(testSchema, ['profile', 'age']);
            expect(result?.$type).toBe('number');
        });

        it('should return array item schema', () => {
            const result = getSchemaForPath(testSchema, ['items', '0']);
            expect(result?.$type).toBe('object');
        });

        it('should return undefined for non-existent path', () => {
            const result = getSchemaForPath(testSchema, ['nonExistent']);
            expect(result).toBeUndefined();
        });
    });
});
