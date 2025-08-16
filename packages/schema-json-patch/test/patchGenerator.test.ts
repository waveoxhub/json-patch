import { describe, it, expect } from 'vitest';
import { generatePatches } from '../src/patchGenerator';
import { Schema } from '../src/types/schema';
import { generatePatchOptionHash } from '../src/utils/hashUtils';

describe('patchGenerator', () => {
    describe('Single Objects', () => {
        it('should generate patch for single property replacement', () => {
            const schema: Schema = {
                $type: 'array',
                $item: {
                    $type: 'object',
                    $pk: 'name',
                    $fields: {
                        name: { $type: 'string' },
                        age: { $type: 'number' },
                    },
                },
            };
            const source = JSON.stringify([{ name: 'xiaoming', age: 25 }]);
            const target = JSON.stringify([{ name: 'xiaoming', age: 30 }]);
            const patches = generatePatches(schema, source, target);
            const result_op = 'replace';
            const result_path = '/xiaoming/age';
            const result_value = 30;
            expect(patches).toHaveLength(1);
            expect(patches[0]).toEqual({
                op: result_op,
                path: result_path,
                value: result_value,
                hash: generatePatchOptionHash(result_op, result_path, result_value),
            });
        });

        it('should update object property', () => {
            const schema: Schema = {
                $type: 'object',

                $fields: {
                    name: { $type: 'string' },
                    age: { $type: 'number' },
                },
            };
            const source = JSON.stringify({ name: 'oldName', age: 25 });
            const target = JSON.stringify({ name: 'newName', age: 25 });

            const patches = generatePatches(schema, source, target);
            const result_op = 'replace';
            const result_path = '/name';
            const result_value = 'newName';
            expect(patches).toHaveLength(1);
            expect(patches[0]).toEqual({
                op: result_op,
                path: result_path,
                value: result_value,
                hash: generatePatchOptionHash(result_op, result_path, result_value),
            });
        });

        it('should update single-property object', () => {
            const schema: Schema = {
                $type: 'object',
                $fields: {
                    name: { $type: 'string' },
                },
            };
            const source = JSON.stringify({ name: 'oldName' });
            const target = JSON.stringify({ name: 'newName' });

            const patches = generatePatches(schema, source, target);
            const result_op = 'replace';
            const result_path = '/name';
            const result_value = 'newName';
            expect(patches).toHaveLength(1);
            expect(patches[0]).toEqual({
                op: result_op,
                path: result_path,
                value: result_value,
                hash: generatePatchOptionHash(result_op, result_path, result_value),
            });
        });

        it('should add new property', () => {
            const schema: Schema = {
                $type: 'object',

                $fields: {
                    name: { $type: 'string' },
                    age: { $type: 'number' },
                    address: { $type: 'string' },
                },
            };
            const source = JSON.stringify({ name: 'test', age: 25 });
            const target = JSON.stringify({ name: 'test', age: 25, address: 'Beijing' });

            const patches = generatePatches(schema, source, target);
            const result_op = 'add';
            const result_path = '/address';
            const result_value = 'Beijing';
            expect(patches).toHaveLength(1);
            expect(patches[0]).toEqual({
                op: result_op,
                path: result_path,
                value: result_value,
                hash: generatePatchOptionHash(result_op, result_path, result_value),
            });
        });

        it('should remove property', () => {
            const schema: Schema = {
                $type: 'object',

                $fields: {
                    name: { $type: 'string' },
                    age: { $type: 'number' },
                },
            };
            const source = JSON.stringify({ name: 'test', age: 25 });
            const target = JSON.stringify({ name: 'test' });

            const patches = generatePatches(schema, source, target);
            const result_op = 'remove';
            const result_path = '/age';
            const result_value = undefined;
            expect(patches).toHaveLength(1);
            expect(patches[0]).toEqual({
                op: result_op,
                path: result_path,
                hash: generatePatchOptionHash(result_op, result_path, result_value),
            });
        });

        it('should handle changes to nested objects', () => {
            const schema: Schema = {
                $type: 'object',

                $fields: {
                    name: { $type: 'string' },
                    profile: {
                        $type: 'object',
                        $fields: {
                            address: { $type: 'string' },
                            phone: { $type: 'string' },
                        },
                    },
                },
            };

            const source = JSON.stringify({
                name: 'test',
                profile: { address: 'Beijing', phone: '12345678' },
            });

            const target = JSON.stringify({
                name: 'test',
                profile: { address: 'Shanghai', phone: '12345678' },
            });

            const patches = generatePatches(schema, source, target);
            const result_op = 'replace';
            const result_path = '/profile/address';
            const result_value = 'Shanghai';
            expect(patches.length).toBe(1);
            expect(patches[0]).toEqual({
                op: result_op,
                path: result_path,
                value: result_value,
                hash: generatePatchOptionHash(result_op, result_path, result_value),
            });
        });

        it('should handle complete nested object replacement', () => {
            const schema: Schema = {
                $type: 'object',

                $fields: {
                    name: { $type: 'string' },
                    profile: {
                        $type: 'object',
                        $fields: {
                            address: { $type: 'string' },
                            phone: { $type: 'string' },
                        },
                    },
                },
            };

            const source = JSON.stringify({
                name: 'test',
                profile: { address: 'Beijing', phone: '12345678' },
            });

            const target = JSON.stringify({
                name: 'test',
                profile: { address: 'Shanghai', phone: '87654321' },
            });

            const patches = generatePatches(schema, source, target);
            const result_op = 'replace';
            const result_path = '/profile';
            const result_value = { address: 'Shanghai', phone: '87654321' };
            expect(patches.length).toBe(1);
            expect(patches[0]).toEqual({
                op: result_op,
                path: result_path,
                value: result_value,
                hash: generatePatchOptionHash(result_op, result_path, result_value),
            });
        });
    });

    describe('Arrays', () => {
        it('should handle simple arrays', () => {
            const schema: Schema = {
                $type: 'object',
                $fields: {
                    items: {
                        $type: 'array',
                        $item: { $type: 'string' },
                    },
                },
            };

            const source = JSON.stringify({ items: ['item1', 'item2', 'item3'] });
            const target = JSON.stringify({ items: ['item1', 'item4', 'item3'] });

            const patches = generatePatches(schema, source, target);
            const result_op = 'replace';
            const result_path = '/items';
            const result_value = ['item1', 'item4', 'item3'];
            expect(patches.length).toBe(1);
            expect(patches[0]).toStrictEqual({
                op: result_op,
                path: result_path,
                value: result_value,
                hash: generatePatchOptionHash(result_op, result_path, result_value),
            });
        });

        it('should handle changes to nested array objects', () => {
            const schema: Schema = {
                $type: 'object',

                $fields: {
                    items: {
                        $type: 'array',
                        $item: {
                            $type: 'object',
                            $pk: 'name',
                            $fields: { name: { $type: 'string' } },
                        },
                    },
                },
            };
            const source = JSON.stringify({ items: [{ name: 'item1' }, { name: 'item2' }] });
            const target = JSON.stringify({ items: [{ name: 'item1' }, { name: 'item3' }] });

            const patches = generatePatches(schema, source, target);
            const result_op1 = 'remove';
            const result_path1 = '/items/item2';
            const result_op2 = 'add';
            const result_path2 = '/items/item3';
            const result_value2 = { name: 'item3' };
            expect(patches).toStrictEqual([
                {
                    op: result_op1,
                    path: result_path1,
                    hash: generatePatchOptionHash(result_op1, result_path1),
                },
                {
                    op: result_op2,
                    path: result_path2,
                    value: result_value2,
                    hash: generatePatchOptionHash(result_op2, result_path2, result_value2),
                },
            ]);
        });

        it('should handle array string as member', () => {
            const schema: Schema = {
                $type: 'object',

                $fields: {
                    name: { $type: 'string' },
                    items: {
                        $type: 'array',
                        $item: { $type: 'string' },
                    },
                },
            };
            const source = JSON.stringify({ name: 'test', items: ['item1', 'item2'] });
            const target = JSON.stringify({ name: 'test', items: ['item1', 'item3'] });

            const patches = generatePatches(schema, source, target);
            const result_op = 'replace';
            const result_path = '/items';
            const result_value = ['item1', 'item3'];
            expect(patches.length).toBe(1);
            expect(patches[0]).toStrictEqual({
                op: result_op,
                path: result_path,
                value: result_value,
                hash: generatePatchOptionHash(result_op, result_path, result_value),
            });
        });

        it('should handle array add project', () => {
            const schema: Schema = {
                $type: 'object',

                $fields: {
                    name: { $type: 'string' },
                    items: {
                        $type: 'array',
                        $item: { $type: 'string' },
                    },
                },
            };
            const source = JSON.stringify({ name: 'test', items: ['item1', 'item2'] });
            const target = JSON.stringify({ name: 'test', items: ['item1', 'item2', 'item3'] });

            const patches = generatePatches(schema, source, target);
            const result_op = 'replace';
            const result_path = '/items';
            const result_value = ['item1', 'item2', 'item3'];
            expect(patches.length).toBe(1);
            expect(patches[0]).toStrictEqual({
                op: result_op,
                path: result_path,
                value: result_value,
                hash: generatePatchOptionHash(result_op, result_path, result_value),
            });
        });

        it('should handle array remove project', () => {
            const schema: Schema = {
                $type: 'object',

                $fields: {
                    name: { $type: 'string' },
                    items: {
                        $type: 'array',
                        $item: { $type: 'string' },
                    },
                },
            };
            const source = JSON.stringify({ name: 'test', items: ['item1', 'item2', 'item3'] });
            const target = JSON.stringify({ name: 'test', items: ['item1', 'item3'] });

            const patches = generatePatches(schema, source, target);
            const result_op = 'replace';
            const result_path = '/items';
            const result_value = ['item1', 'item3'];
            expect(patches.length).toBe(1);
            expect(patches[0]).toStrictEqual({
                op: result_op,
                path: result_path,
                value: result_value,
                hash: generatePatchOptionHash(result_op, result_path, result_value),
            });
        });

        it('should handle array object element change', () => {
            const schema: Schema = {
                $type: 'object',
                $fields: {
                    name: { $type: 'string' },
                    users: {
                        $type: 'array',
                        $item: {
                            $pk: 'id',
                            $type: 'object',
                            $fields: {
                                id: { $type: 'string' },
                                age: { $type: 'number' },
                            },
                        },
                    },
                },
            };

            const source = JSON.stringify({
                name: 'test',
                users: [
                    { id: 'u1', age: 25 },
                    { id: 'u2', age: 30 },
                ],
            });

            const target = JSON.stringify({
                name: 'test',
                users: [
                    { id: 'u1', age: 26 },
                    { id: 'u2', age: 30 },
                ],
            });

            const patches = generatePatches(schema, source, target);
            const result_op = 'replace';
            const result_path = '/users/u1/age';
            const result_value = 26;
            expect(patches.length).toBe(1);
            expect(patches[0]).toEqual({
                op: result_op,
                path: result_path,
                value: result_value,
                hash: generatePatchOptionHash(result_op, result_path, result_value),
            });
        });
    });

    describe('Special Cases', () => {
        it('should handle empty object change', () => {
            const schema: Schema = {
                $type: 'object',

                $fields: {
                    name: { $type: 'string' },
                    data: {
                        $type: 'object',
                        $fields: {
                            temp: { $type: 'string' },
                        },
                    },
                },
            };

            const source = JSON.stringify({ name: 'test', data: { temp: '' } });
            const target = JSON.stringify({ name: 'test', data: { temp: '', newField: 'value' } });

            const patches = generatePatches(schema, source, target);
            const result_op = 'add';
            const result_path = '/data/newField';
            const result_value = 'value';
            expect(patches.length).toBe(1);
            expect(patches[0]).toStrictEqual({
                op: result_op,
                path: result_path,
                value: result_value,
                hash: generatePatchOptionHash(result_op, result_path, result_value),
            });
        });

        it('should handle completely different objects', () => {
            const schema: Schema = {
                $type: 'object',
                $fields: {
                    data: {
                        $type: 'object',
                        $fields: {
                            temp: { $type: 'string' },
                        },
                    },
                },
            };

            const source = JSON.stringify({ data: { temp: '', field1: 'old' } });
            const target = JSON.stringify({ data: { temp: '', field2: 'new' } });

            const patches = generatePatches(schema, source, target);
            const result_op1 = 'remove';
            const result_path1 = '/data/field1';
            const result_value1 = undefined;
            const result_op2 = 'add';
            const result_path2 = '/data/field2';
            const result_value2 = 'new';
            expect(patches).toStrictEqual([
                {
                    op: result_op1,
                    path: result_path1,
                    hash: generatePatchOptionHash(result_op1, result_path1, result_value1),
                },
                {
                    op: result_op2,
                    path: result_path2,
                    value: result_value2,
                    hash: generatePatchOptionHash(result_op2, result_path2, result_value2),
                },
            ]);
        });

        it('should handle array element position change', () => {
            const schema: Schema = {
                $type: 'object',

                $fields: {
                    items: { $type: 'array', $item: { $type: 'string' } },
                },
            };

            const source = JSON.stringify({ items: ['a', 'b', 'c'] });
            const target = JSON.stringify({ items: ['c', 'a', 'b'] });

            const patches = generatePatches(schema, source, target);
            const result_op = 'replace';
            const result_path = '/items';
            const result_value = ['c', 'a', 'b'];
            expect(patches).toStrictEqual([
                {
                    op: result_op,
                    path: result_path,
                    value: result_value,
                    hash: generatePatchOptionHash(result_op, result_path, result_value),
                },
            ]);
        });
    });

    describe('Complex Objects and Arrays', () => {
        it('should handle deep nested objects and arrays', () => {
            const schema: Schema = {
                $type: 'object',
                $fields: {
                    id: { $type: 'string' },
                    data: {
                        $type: 'object',
                        $fields: {
                            users: {
                                $type: 'array',
                                $item: {
                                    $type: 'object',
                                    $pk: 'name',
                                    $fields: {
                                        name: { $type: 'string' },
                                        details: {
                                            $type: 'object',
                                            $fields: {
                                                age: { $type: 'number' },
                                                roles: {
                                                    $type: 'array',
                                                    $item: { $type: 'string' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            };

            const source = JSON.stringify({
                id: '1',
                data: {
                    users: [
                        {
                            name: 'Alice',
                            details: {
                                age: 30,
                                roles: ['admin', 'user'],
                            },
                        },
                    ],
                },
            });

            const target = JSON.stringify({
                id: '1',
                data: {
                    users: [
                        {
                            name: 'Alice',
                            details: {
                                age: 31,
                                roles: ['admin', 'user', 'editor'],
                            },
                        },
                    ],
                },
            });

            const patches = generatePatches(schema, source, target);
            const result_op = 'replace';
            const result_path = '/data/users/Alice/details';
            const result_value = { age: 31, roles: ['admin', 'user', 'editor'] };
            expect(patches).toStrictEqual([
                {
                    op: result_op,
                    path: result_path,
                    value: result_value,
                    hash: generatePatchOptionHash(result_op, result_path, result_value),
                },
            ]);
        });
    });

    describe('Complex Array Handling', () => {
        it('should handle array element position change', () => {
            const schema: Schema = {
                $type: 'array',
                $item: {
                    $type: 'object',
                    $pk: 'id',
                    $fields: {
                        id: { $type: 'string' },
                        value: { $type: 'string' },
                    },
                },
            };

            const source = JSON.stringify([
                { id: '1', value: 'value1' },
                { id: '2', value: 'value2' },
                { id: '3', value: 'value3' },
            ]);

            const target = JSON.stringify([
                { id: '3', value: 'value3' },
                { id: '1', value: 'value1' },
                { id: '2', value: 'value2' },
            ]);

            const patches = generatePatches(schema, source, target);

            // 数组元素位置变化不应产生补丁
            expect(patches).toHaveLength(0);
        });

        it('should handle array element add and remove', () => {
            const schema: Schema = {
                $type: 'array',
                $item: {
                    $type: 'object',
                    $pk: 'id',
                    $fields: {
                        id: { $type: 'string' },
                        value: { $type: 'string' },
                    },
                },
            };

            const source = JSON.stringify([
                { id: '1', value: 'value1' },
                { id: '2', value: 'value2' },
            ]);

            const target = JSON.stringify([
                { id: '1', value: 'value1' },
                { id: '3', value: 'value3' },
            ]);

            const patches = generatePatches(schema, source, target);

            expect(patches).toHaveLength(2);
            expect(patches).toContainEqual({
                op: 'remove',
                path: '/2',
                hash: generatePatchOptionHash('remove', '/2', undefined),
            });
            expect(patches).toContainEqual({
                op: 'add',
                path: '/3',
                value: { id: '3', value: 'value3' },
                hash: generatePatchOptionHash('add', '/3', { id: '3', value: 'value3' }),
            });
        });

        it('should handle nested array modification', () => {
            const schema: Schema = {
                $type: 'object',
                $fields: {
                    items: {
                        $type: 'array',
                        $item: {
                            $type: 'object',
                            $pk: 'id',
                            $fields: {
                                id: { $type: 'string' },
                                name: { $type: 'string' },
                            },
                        },
                    },
                },
            };

            const source = JSON.stringify({
                items: [
                    { id: '1', name: 'item1' },
                    { id: '2', name: 'item2' },
                ],
            });

            const target = JSON.stringify({
                items: [
                    { id: '1', name: 'item1' },
                    { id: '2', name: 'updated-item2' },
                    { id: '3', name: 'item3' },
                ],
            });

            const patches = generatePatches(schema, source, target);

            // 验证补丁非空
            expect(patches.length).toBeGreaterThan(0);

            // 验证"updated-item2"和"item3"在补丁中出现
            const patchString = JSON.stringify(patches);
            expect(patchString).toContain('updated-item2');
            expect(patchString).toContain('item3');

            // 使用具体的补丁对象断言
            const result_op1 = 'replace';
            const result_path1 = '/items/2/name';
            const result_value1 = 'updated-item2';
            const result_op2 = 'add';
            const result_path2 = '/items/3';
            const result_value2 = { id: '3', name: 'item3' };
            expect(patches).toContainEqual({
                op: result_op1,
                path: result_path1,
                value: result_value1,
                hash: generatePatchOptionHash(result_op1, result_path1, result_value1),
            });

            expect(patches).toContainEqual({
                op: result_op2,
                path: result_path2,
                value: result_value2,
                hash: generatePatchOptionHash(result_op2, result_path2, result_value2),
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty object to non-empty object conversion', () => {
            const schema: Schema = {
                $type: 'object',
                $fields: {
                    name: { $type: 'string' },
                    age: { $type: 'number' },
                },
            };

            const source = JSON.stringify({});
            const target = JSON.stringify({ name: 'test', age: 25 });

            const patches = generatePatches(schema, source, target);
            const result_op = 'replace';
            const result_path = '';
            const result_value = { name: 'test', age: 25 };
            expect(patches).toStrictEqual([
                {
                    op: result_op,
                    path: result_path,
                    value: result_value,
                    hash: generatePatchOptionHash(result_op, result_path, result_value),
                },
            ]);
        });

        it('should handle non-empty object to empty object conversion', () => {
            const schema: Schema = {
                $type: 'object',
                $fields: {
                    name: { $type: 'string' },
                    age: { $type: 'number' },
                },
            };

            const source = JSON.stringify({ name: 'test', age: 25 });
            const target = JSON.stringify({});

            const patches = generatePatches(schema, source, target);
            const result_op = 'replace';
            const result_path = '';
            const result_value = {};
            expect(patches.length).toBe(1);
            expect(patches[0]).toEqual({
                op: result_op,
                path: result_path,
                value: result_value,
                hash: generatePatchOptionHash(result_op, result_path, result_value),
            });
        });

        it('should handle deep nested object change in edge cases', () => {
            const schema: Schema = {
                $type: 'object',
                $fields: {
                    level1: {
                        $type: 'object',
                        $fields: {
                            level2: {
                                $type: 'object',
                                $fields: {
                                    level3: {
                                        $type: 'object',
                                        $fields: {
                                            value: { $type: 'string' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            };

            const source = JSON.stringify({
                level1: {
                    level2: {
                        level3: {
                            value: 'old',
                        },
                    },
                },
            });

            const target = JSON.stringify({
                level1: {
                    level2: {
                        level3: {
                            value: 'new',
                        },
                    },
                },
            });

            const patches = generatePatches(schema, source, target);
            const result_op = 'replace';
            const result_path = '/level1/level2/level3/value';
            const result_value = 'new';
            expect(patches.length).toBe(1);
            expect(patches[0]).toStrictEqual({
                op: result_op,
                path: result_path,
                value: result_value,
                hash: generatePatchOptionHash(result_op, result_path, result_value),
            });
        });
    });
});
