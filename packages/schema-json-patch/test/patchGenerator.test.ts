import { describe, it, expect } from 'vitest';
import { generatePatches } from '../src/patchGenerator';
import { Schema } from '../src/types/schema';

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
            console.log(JSON.stringify(patches, null, 2));
            expect(patches).toHaveLength(1);
            expect(patches[0]).toEqual({
                op: 'replace',
                path: '/xiaoming/age',
                value: 30,
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
            expect(patches).toHaveLength(1);
            expect(patches[0]).toEqual({ op: 'replace', path: '/name', value: 'newName' });
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
            expect(patches).toHaveLength(1);
            expect(patches[0]).toEqual({ op: 'replace', path: '/name', value: 'newName' });
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
            expect(patches).toHaveLength(1);
            expect(patches[0]).toEqual({
                op: 'add',
                path: '/address',
                value: 'Beijing',
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
            expect(patches).toHaveLength(1);
            expect(patches[0]).toEqual({
                op: 'remove',
                path: '/age',
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
            expect(patches.length).toBe(1);
            expect(patches[0]).toEqual({
                op: 'replace',
                path: '/profile/address',
                value: 'Shanghai',
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
            expect(patches.length).toBe(1);
            expect(patches[0]).toEqual({
                op: 'replace',
                path: '/profile',
                value: { address: 'Shanghai', phone: '87654321' },
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
            expect(patches.length).toBe(1);
            expect(patches[0]).toStrictEqual({
                op: 'replace',
                path: '/items',
                value: ['item1', 'item4', 'item3'],
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
            expect(patches).toStrictEqual([
                { op: 'remove', path: '/items/item2' },
                { op: 'add', path: '/items/item3', value: { name: 'item3' } },
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
            expect(patches.length).toBe(1);
            expect(patches[0]).toStrictEqual({
                op: 'replace',
                path: '/items',
                value: ['item1', 'item3'],
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
            expect(patches.length).toBe(1);
            expect(patches[0]).toStrictEqual({
                op: 'replace',
                path: '/items',
                value: ['item1', 'item2', 'item3'],
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
            expect(patches.length).toBe(1);
            expect(patches[0]).toEqual({
                op: 'replace',
                path: '/items',
                value: ['item1', 'item3'],
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
            expect(patches.length).toBe(1);
            expect(patches[0]).toEqual({ op: 'replace', path: '/users/u1/age', value: 26 });
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
            expect(patches.length).toBe(1);
            expect(patches[0]).toStrictEqual({ op: 'add', path: '/data/newField', value: 'value' });
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
            expect(patches).toStrictEqual([
                { op: 'remove', path: '/data/field1' },
                { op: 'add', path: '/data/field2', value: 'new' },
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
            expect(patches).toStrictEqual([
                { op: 'replace', path: '/items', value: ['c', 'a', 'b'] },
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
            expect(patches).toStrictEqual([
                {
                    op: 'replace',
                    path: '/data/users/Alice/details',
                    value: { age: 31, roles: ['admin', 'user', 'editor'] },
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
            });
            expect(patches).toContainEqual({
                op: 'add',
                path: '/3',
                value: { id: '3', value: 'value3' },
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
            expect(patches).toStrictEqual([
                {
                    op: 'replace',
                    path: '',
                    value: { name: 'test', age: 25 },
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
            expect(patches.length).toBe(1);
            expect(patches[0]).toEqual({
                op: 'replace',
                path: '',
                value: {},
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
            expect(patches.length).toBe(1);
            expect(patches[0]).toStrictEqual({
                op: 'replace',
                path: '/level1/level2/level3/value',
                value: 'new',
            });
        });
    });
});
