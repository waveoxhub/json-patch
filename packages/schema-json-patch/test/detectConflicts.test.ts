import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../src';
import { Patch } from '../src/types/patch';

describe('detectConflicts', () => {
    it('should detect conflicts when two patches modify the same property', () => {
        const patch1: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'patch1Name',
            },
        ];

        const patch2: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'patch2Name',
            },
        ];

        const conflicts = detectConflicts([patch1, patch2]);
        expect(conflicts).toStrictEqual([
            {
                path: '/name',
                operations: [
                    {
                        operation: 'replace',
                        index: 0,
                        groupIndex: 0,
                    },
                    {
                        operation: 'replace',
                        index: 1,
                        groupIndex: 1,
                    },
                ],
                patches: [
                    {
                        op: 'replace',
                        path: '/name',
                        value: 'patch1Name',
                    },
                    {
                        op: 'replace',
                        path: '/name',
                        value: 'patch2Name',
                    },
                ],
            },
        ]);
    });

    it('should not have conflicts when patches modify different properties', () => {
        const patch1: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'newName',
            },
        ];

        const patch2: Patch[] = [
            {
                op: 'replace',
                path: '/age',
                value: 30,
            },
        ];

        const conflicts = detectConflicts([patch1, patch2]);

        expect(conflicts.length).toBe(0);
    });

    it('should detect conflicts when one patch removes an object and another modifies its property', () => {
        const patch1: Patch[] = [
            {
                op: 'remove',
                path: '/user',
            },
        ];

        const patch2: Patch[] = [
            {
                op: 'replace',
                path: '/user/name',
                value: 'newName',
            },
        ];

        const conflicts = detectConflicts([patch1, patch2]);
        expect(conflicts).toStrictEqual([
            {
                path: '/user/name',
                operations: [
                    {
                        operation: 'remove',
                        index: 0,
                        groupIndex: 0,
                    },
                    {
                        operation: 'replace',
                        index: 1,
                        groupIndex: 1,
                    },
                ],
                patches: [
                    {
                        op: 'remove',
                        path: '/user',
                    },
                    {
                        op: 'replace',
                        path: '/user/name',
                        value: 'newName',
                    },
                ],
            },
        ]);
    });

    it('should not have conflicts when two patches modify different array indices', () => {
        const patch1: Patch[] = [
            {
                op: 'replace',
                path: '/items/0',
                value: 'newItem1',
            },
        ];

        const patch2: Patch[] = [
            {
                op: 'replace',
                path: '/items/1',
                value: 'newItem2',
            },
        ];

        const conflicts = detectConflicts([patch1, patch2]);

        expect(conflicts.length).toBe(0);
    });

    it('should detect conflicts across different patch groups', () => {
        const patches1: Patch[] = [
            {
                op: 'replace',
                path: '/users/0/name',
                value: 'Alice Chen',
            },
            {
                op: 'add',
                path: '/settings/language',
                value: 'zh-CN',
            },
        ];

        const patches2: Patch[] = [
            {
                op: 'replace',
                path: '/users/0/name',
                value: 'Alice Wang',
            },
            {
                op: 'add',
                path: '/settings/language',
                value: 'en-US',
            },
        ];

        const conflicts = detectConflicts([patches1, patches2]);
        expect(conflicts.length).toBe(2);

        // Check first conflict
        expect(conflicts[0].path).toBe('/users/0/name');
        expect(conflicts[0].operations).toHaveLength(2);

        // Check second conflict
        expect(conflicts[1].path).toBe('/settings/language');
        expect(conflicts[1].operations).toHaveLength(2);
    });

    it('should handle empty patch groups', () => {
        const conflicts = detectConflicts([]);
        expect(conflicts.length).toBe(0);
    });

    it('should handle single patch group correctly', () => {
        const patches: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'Alice',
            },
            {
                op: 'add',
                path: '/age',
                value: 30,
            },
        ];

        const conflicts = detectConflicts([patches]);
        expect(conflicts.length).toBe(0);
    });

    it('should handle cases with empty patch groups', () => {
        const patches1: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'Alice',
            },
        ];

        const patches2: Patch[] = [];

        const conflicts = detectConflicts([patches1, patches2]);
        expect(conflicts.length).toBe(0);
    });

    it('should identify conflicts between different operation types', () => {
        const patches1: Patch[] = [
            {
                op: 'add',
                path: '/users/0/profile',
                value: { age: 30 },
            },
        ];

        const patches2: Patch[] = [
            {
                op: 'replace',
                path: '/users/0/profile',
                value: { age: 25 },
            },
        ];

        const conflicts = detectConflicts([patches1, patches2]);
        expect(conflicts.length).toBe(1);
        expect(conflicts[0].path).toBe('/users/0/profile');

        // Check for different operation types
        const operations = conflicts[0].operations;
        expect(operations[0].operation).toBe('add');
        expect(operations[1].operation).toBe('replace');
    });

    it('should identify path prefix conflicts', () => {
        const patches1: Patch[] = [
            {
                op: 'replace',
                path: '/users/0',
                value: { name: 'Alice', age: 30 },
            },
        ];

        const patches2: Patch[] = [
            {
                op: 'replace',
                path: '/users/0/name',
                value: 'Bob',
            },
        ];

        const conflicts = detectConflicts([patches1, patches2]);
        expect(conflicts.length).toBeGreaterThan(0);

        // Path prefix conflict may appear in different forms, check for any conflict
        const hasConflict = conflicts.some(
            c =>
                c.path === '/users/0' ||
                c.path === '/users/0/name' ||
                (c.path.startsWith('/users/0') &&
                    c.operations.some(op => patches1.some(p => p.path === op.operation)))
        );
        expect(hasConflict).toBe(true);
    });

    it('should handle different paths without conflicts', () => {
        const patches1: Patch[] = [
            {
                op: 'replace',
                path: '/users/0/name',
                value: 'Alice',
            },
        ];

        const patches2: Patch[] = [
            {
                op: 'replace',
                path: '/users/1/name',
                value: 'Bob',
            },
        ];

        const conflicts = detectConflicts([patches1, patches2]);
        expect(conflicts.length).toBe(0);
    });

    it('should handle remove operation conflicts correctly', () => {
        const patches1: Patch[] = [
            {
                op: 'remove',
                path: '/users/0',
            },
        ];

        const patches2: Patch[] = [
            {
                op: 'replace',
                path: '/users/0/name',
                value: 'Alice',
            },
        ];

        const conflicts = detectConflicts([patches1, patches2]);
        expect(conflicts.length).toBeGreaterThan(0);

        // Confirm remove and replace operations are recognized as conflicts
        const conflict = conflicts.find(c => c.path === '/users/0' || c.path === '/users/0/name');
        expect(conflict).toBeDefined();
    });

    it('should identify complex conflicts in deeply nested structures', () => {
        const patch1: Patch[] = [
            {
                op: 'replace',
                path: '/users/user123/addresses/0/city',
                value: 'Beijing',
            },
            {
                op: 'replace',
                path: '/users/user123/addresses/0/zipcode',
                value: '100000',
            },
        ];

        const patch2: Patch[] = [
            {
                op: 'remove',
                path: '/users/user123/addresses/0',
            },
            {
                op: 'add',
                path: '/users/user123/addresses/1',
                value: {
                    city: 'Shanghai',
                    zipcode: '200000',
                },
            },
        ];

        const conflicts = detectConflicts([patch1, patch2]);

        // Should detect conflict because second patch group deletes the address that first patch group wants to modify
        expect(conflicts.length).toBeGreaterThan(0);

        // Verify conflict details
        const cityConflict = conflicts.find(c => c.path === '/users/user123/addresses/0/city');
        expect(cityConflict).toBeDefined();
        expect(cityConflict?.operations).toHaveLength(2);

        const zipcodeConflict = conflicts.find(
            c => c.path === '/users/user123/addresses/0/zipcode'
        );
        expect(zipcodeConflict).toBeDefined();
        expect(zipcodeConflict?.operations).toHaveLength(2);
    });

    it('should not detect conflict when replacing whole object and updating a property with identical value', () => {
        const patch1: Patch[] = [
            {
                op: 'replace',
                path: '/contact-1',
                value: {
                    id: 'contact-1',
                    name: '张三(技术总监)',
                    phone: '13888888888',
                    email: 'zhangsan@newemail.com',
                    tags: ['同事', '技术部', '管理层'],
                    address: '北京市朝阳区',
                },
            },
        ];

        const patch2: Patch[] = [
            {
                op: 'replace',
                path: '/contact-1/phone',
                value: '13888888888',
            },
        ];

        const conflicts = detectConflicts([patch1, patch2]);
        expect(conflicts.length).toBe(0);
    });
});
