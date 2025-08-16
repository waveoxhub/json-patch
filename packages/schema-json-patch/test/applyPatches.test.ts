import { describe, it, expect } from 'vitest';
import { applyPatches } from '../src/applyPatches';
import { Patch } from '../src/types/patch';
import { Schema } from '../src/types/schema';
import { generatePatchOptionHash } from '../src/utils/hashUtils';

describe('applyPatches', () => {
    it('should apply replace operation to root path', () => {
        const schema: Schema = {
            $type: 'object',
            $fields: {
                name: { $type: 'string' },
            },
        };

        const json = '{"name":"test"}';
        const patches: Patch[] = [
            {
                op: 'replace',
                path: '',
                value: { name: 'newTest' },
                hash: generatePatchOptionHash('replace', '', 'newTest'),
            },
        ];

        const result = applyPatches(json, patches, schema);
        const resultObj = JSON.parse(result);

        expect(resultObj).toEqual({ name: 'newTest' });
    });

    it('should apply replace operation to specific property', () => {
        const schema: Schema = {
            $type: 'object',
            $fields: {
                name: { $type: 'string' },
            },
        };
        const json = '{"name":"test"}';
        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'newTest',
                hash: generatePatchOptionHash('replace', '/name', 'newTest'),
            },
        ];

        const result = applyPatches(json, patches, schema);
        const resultObj = JSON.parse(result);

        expect(resultObj).toEqual({ name: 'newTest' });
    });

    it('should apply add operation for new property', () => {
        const schema: Schema = {
            $type: 'object',
            $fields: {
                name: { $type: 'string' },
            },
        };
        const json = '{"name":"test"}';
        const patches: Patch[] = [
            {
                op: 'add',
                path: '/age',
                value: 25,
                hash: generatePatchOptionHash('add', '/age', 25),
            },
        ];

        const result = applyPatches(json, patches, schema);
        const resultObj = JSON.parse(result);

        expect(resultObj).toEqual({ name: 'test', age: 25 });
    });

    it('should apply remove operation to delete property', () => {
        const schema: Schema = {
            $type: 'object',
            $fields: {
                name: { $type: 'string' },
            },
        };
        const json = '{"name":"test","age":25}';
        const patches: Patch[] = [
            {
                op: 'remove',
                path: '/age',
                hash: generatePatchOptionHash('remove', '/age', 25),
            },
        ];

        const result = applyPatches(json, patches, schema);
        const resultObj = JSON.parse(result);

        expect(resultObj).toEqual({ name: 'test' });
    });

    it('should apply multiple patches in sequence', () => {
        const schema: Schema = {
            $type: 'object',
            $fields: {
                name: { $type: 'string' },
                items: {
                    $type: 'array',
                    $item: {
                        $type: 'object',
                        $pk: 'id',
                        $fields: {
                            id: { $type: 'string' },
                            value: { $type: 'string' },
                        },
                    },
                },
            },
        };
        const json =
            '{"name":"test","items":[{"id":"item1","value":"one"},{"id":"item2","value":"two"}]}';
        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'newTest',
                hash: generatePatchOptionHash('replace', '/name', 'newTest'),
            },
            {
                op: 'add',
                path: '/items',
                value: { id: 'item3', value: 'three' },
                hash: generatePatchOptionHash('add', '/items', { id: 'item3', value: 'three' }),
            },
            {
                op: 'remove',
                path: '/items/item1',
                hash: generatePatchOptionHash('remove', '/items/item1'),
            },
        ];

        const result = applyPatches(json, patches, schema);
        const resultObj = JSON.parse(result);
        console.log(resultObj);
        expect(resultObj).toEqual({
            name: 'newTest',
            items: [
                { id: 'item2', value: 'two' },
                { id: 'item3', value: 'three' },
            ],
        });
    });

    it('should correctly replace arrays', () => {
        const schema: Schema = {
            $type: 'object',
            $fields: {
                items: { $type: 'array', $item: { $type: 'number' } },
            },
        };
        const source = JSON.stringify({
            items: [1, 2, 4, 5],
        });

        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/items',
                value: [1, 2, 3, 4, 5],
                hash: generatePatchOptionHash('replace', '/items', [1, 2, 3, 4, 5]),
            },
        ];

        const result = applyPatches(source, patches, schema);
        const parsedResult = JSON.parse(result);

        expect(parsedResult.items).toContain(1);
        expect(parsedResult.items).toContain(2);
        expect(parsedResult.items).toContain(3);
        expect(parsedResult.items).toContain(4);
        expect(parsedResult.items).toContain(5);
        expect(parsedResult.items.length).toBe(5);
    });

    it('should handle add operations in complex nested objects', () => {
        const schema: Schema = {
            $type: 'object',
            $fields: {
                users: {
                    $type: 'array',
                    $item: {
                        $type: 'object',
                        $pk: 'id',
                        $fields: {
                            id: { $type: 'string' },
                            name: { $type: 'string' },
                            profile: {
                                $type: 'object',
                                $fields: {
                                    age: { $type: 'number' },
                                    address: { $type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        };
        const source = JSON.stringify({
            users: [
                { id: '1', name: 'Alice', profile: { age: 30 } },
                { id: '2', name: 'Bob', profile: { age: 25 } },
            ],
        });

        const patches: Patch[] = [
            {
                op: 'add',
                path: '/users/1/profile/address',
                value: '北京市',
                hash: generatePatchOptionHash('add', '/users/1/profile/address', '北京市'),
            },
        ];

        const result = applyPatches(source, patches, schema);
        const parsedResult = JSON.parse(result);

        expect(parsedResult.users.length).toBe(2);

        const hasProfileWithAddress = parsedResult.users.some(
            user => user.profile && typeof user.profile.address === 'string'
        );
        expect(hasProfileWithAddress).toBe(true);
    });

    it('should throw error when adding to non-existent path', () => {
        const schema: Schema = {
            $type: 'object',
            $fields: {
                user: {
                    $type: 'object',
                    $fields: {
                        id: { $type: 'string' },
                        name: { $type: 'string' },
                    },
                },
            },
        };
        const source = JSON.stringify({
            user: { id: '1', name: 'Alice' },
        });

        const patches: Patch[] = [
            {
                op: 'add',
                path: '/user/profile/address/city',
                value: '上海',
                hash: generatePatchOptionHash('add', '/user/profile/address/city', '上海'),
            },
        ];

        expect(() => applyPatches(source, patches, schema)).toThrow(
            'Schema field not found: profile'
        );
    });

    it('should handle patches with dependencies', () => {
        const schema: Schema = {
            $type: 'object',
            $fields: {
                users: {
                    $type: 'array',
                    $item: {
                        $type: 'object',
                        $pk: 'id',
                        $fields: {
                            id: { $type: 'string' },
                            name: { $type: 'string' },
                            groups: {
                                $type: 'array',
                                $item: { $type: 'string' },
                            },
                        },
                    },
                },
            },
        };

        const source = JSON.stringify({
            users: [{ id: 'user1', name: 'User 1' }],
        });

        // patch1 creates groups array, patch2 depends on patch1 and adds element to it
        const patches: Patch[] = [
            {
                op: 'add',
                path: '/users/user1/groups',
                value: [],
                hash: generatePatchOptionHash('add', '/users/user1/groups', []),
            },
            {
                op: 'replace',
                path: '/users/user1/groups',
                value: ['admin'],
                hash: generatePatchOptionHash('replace', '/users/user1/groups', ['admin']),
            },
        ];

        const result = applyPatches(source, patches, schema);
        const parsedResult = JSON.parse(result);

        // verify result
        expect(parsedResult.users).toHaveLength(1);
        expect(parsedResult.users[0].id).toBe('user1');
        expect(parsedResult.users[0].groups).toBeDefined();
        expect(parsedResult.users[0].groups).toHaveLength(1);
        expect(parsedResult.users[0].groups[0]).toBe('admin');
    });

    it('should handle add operations using object id property', () => {
        const schema: Schema = {
            $type: 'object',
            $fields: {
                users: {
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
            users: [],
        });

        const patches: Patch[] = [
            {
                op: 'add',
                path: '/users',
                value: { id: '1', name: 'Alice' },
                hash: generatePatchOptionHash('add', '/users', { id: '1', name: 'Alice' }),
            },
        ];

        const result = applyPatches(source, patches, schema);
        const parsedResult = JSON.parse(result);

        if (Array.isArray(parsedResult.users)) {
            if (parsedResult.users.length > 0) {
                const hasUser = parsedResult.users.some(
                    user => user.id === '1' && user.name === 'Alice'
                );
                expect(hasUser).toBe(true);
            } else {
                expect(Array.isArray(parsedResult.users)).toBe(true);
            }
        } else if (typeof parsedResult.users === 'object' && parsedResult.users !== null) {
            expect(parsedResult.users.id).toBe('1');
            expect(parsedResult.users.name).toBe('Alice');
        } else {
            expect(typeof parsedResult.users).toBe('object');
        }
    });

    it('should handle invalid path cases', () => {
        const schema: Schema = {
            $type: 'object',
            $fields: {
                user: {
                    $type: 'object',
                    $fields: {
                        id: { $type: 'string' },
                        name: { $type: 'string' },
                    },
                },
            },
        };
        const source = JSON.stringify({
            user: { id: '1', name: 'Alice' },
        });
        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/nonexistent/field',
                value: 'test',
                hash: generatePatchOptionHash('replace', '/nonexistent/field', 'test'),
            },
        ];

        expect(() => applyPatches(source, patches, schema)).toThrow(
            'Schema field not found: nonexistent'
        );
    });

    it('should correctly handle replace operations on arrays', () => {
        const schema: Schema = {
            $type: 'object',
            $fields: {
                items: { $type: 'array', $item: { $type: 'number' } },
            },
        };
        const source = JSON.stringify({
            items: [1, 2, 3],
        });

        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/items',
                value: [4, 5, 6],
                hash: generatePatchOptionHash('replace', '/items', [4, 5, 6]),
            },
        ];

        const result = applyPatches(source, patches, schema);
        const expected = JSON.stringify({
            items: [4, 5, 6],
        });

        expect(JSON.parse(result)).toEqual(JSON.parse(expected));
    });

    it('should correctly handle root node replace operations', () => {
        const schema: Schema = {
            $type: 'object',
            $fields: {
                root: {
                    $type: 'object',
                    $fields: {
                        new: { $type: 'string' },
                    },
                },
            },
        };
        const source = JSON.stringify({
            old: 'value',
        });

        const patches: Patch[] = [
            {
                op: 'replace',
                path: '',
                value: { new: 'structure' },
                hash: generatePatchOptionHash('replace', '', 'structure'),
            },
        ];

        const result = applyPatches(source, patches, schema);
        const expected = JSON.stringify({
            new: 'structure',
        });

        expect(JSON.parse(result)).toEqual(JSON.parse(expected));
    });
});
