import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../src';
import { Patch } from '../src/types/patch';
import { generatePatchOptionHash } from '../src/utils/hashUtils';

describe('detectConflicts', () => {
    it('should detect conflicts when two patches modify the same property', () => {
        const patch1: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'patch1Name',
                hash: generatePatchOptionHash('replace', '/name', 'patch1Name'),
            },
        ];

        const patch2: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'patch2Name',
                hash: generatePatchOptionHash('replace', '/name', 'patch2Name'),
            },
        ];

        const conflicts = detectConflicts([patch1, patch2]);
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].path).toBe('/name');
        expect(conflicts[0].options).toHaveLength(2);
        expect(conflicts[0].options[0]?.hash).toBe(
            generatePatchOptionHash('replace', '/name', 'patch1Name')
        );
        expect(conflicts[0].options[1]?.hash).toBe(
            generatePatchOptionHash('replace', '/name', 'patch2Name')
        );
        expect(conflicts[0].options[0]?.patch).toMatchObject(patch1[0]);
        expect(conflicts[0].options[1]?.patch).toMatchObject(patch2[0]);
    });

    it('should not have conflicts when patches modify different properties', () => {
        const patch1: Patch[] = [
            {
                op: 'replace',
                path: '/name',
                value: 'newName',
                hash: generatePatchOptionHash('replace', '/name', 'newName'),
            },
        ];

        const patch2: Patch[] = [
            {
                op: 'replace',
                path: '/age',
                value: 30,
                hash: generatePatchOptionHash('replace', '/age', 30),
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
                hash: generatePatchOptionHash('remove', '/user'),
            },
        ];

        const patch2: Patch[] = [
            {
                op: 'replace',
                path: '/user/name',
                value: 'newName',
                hash: generatePatchOptionHash('replace', '/user/name', 'newName'),
            },
        ];

        const conflicts = detectConflicts([patch1, patch2]);
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].path).toBe('/user');
        expect(conflicts[0].options).toHaveLength(2);
        expect(conflicts[0].options[0]?.hash).toBe(generatePatchOptionHash('remove', '/user'));
        expect(conflicts[0].options[1]?.hash).toBe(
            generatePatchOptionHash('replace', '/user/name', 'newName')
        );
        expect(conflicts[0].options[0]?.patch).toMatchObject(patch1[0]);
        expect(conflicts[0].options[1]?.patch).toMatchObject(patch2[0]);
    });

    it('should not have conflicts when two patches modify different array indices', () => {
        const patch1: Patch[] = [
            {
                op: 'replace',
                path: '/items/0',
                value: 'newItem1',
                hash: generatePatchOptionHash('replace', '/items/0', 'newItem1'),
            },
        ];

        const patch2: Patch[] = [
            {
                op: 'replace',
                path: '/items/1',
                value: 'newItem2',
                hash: generatePatchOptionHash('replace', '/items/1', 'newItem2'),
            },
        ];

        const conflicts = detectConflicts([patch1, patch2]);

        expect(conflicts.length).toBe(0);
    });

    it('should detect conflicts across different patch groups', () => {
        const hash1_1 = generatePatchOptionHash('replace', '/users/0/name', 'Alice Chen');
        const hash1_2 = generatePatchOptionHash('add', '/settings/language', 'zh-CN');
        const hash2_1 = generatePatchOptionHash('replace', '/users/0/name', 'Alice Wang');
        const hash2_2 = generatePatchOptionHash('add', '/settings/language', 'en-US');

        const patches1: Patch[] = [
            {
                op: 'replace',
                path: '/users/0/name',
                value: 'Alice Chen',
                hash: hash1_1,
            },
            {
                op: 'add',
                path: '/settings/language',
                value: 'zh-CN',
                hash: hash1_2,
            },
        ];

        const patches2: Patch[] = [
            {
                op: 'replace',
                path: '/users/0/name',
                value: 'Alice Wang',
                hash: hash2_1,
            },
            {
                op: 'add',
                path: '/settings/language',
                value: 'en-US',
                hash: hash2_2,
            },
        ];

        const conflicts = detectConflicts([patches1, patches2]);
        expect(conflicts.length).toBe(2);

        // Check first conflict
        expect(conflicts[0].path).toBe('/users/0/name');
        expect(conflicts[0].options).toHaveLength(2);
        expect(conflicts[0].options.some(opt => opt.hash === hash1_1)).toBe(true);
        expect(conflicts[0].options.some(opt => opt.hash === hash2_1)).toBe(true);

        // Check second conflict
        expect(conflicts[1].path).toBe('/settings/language');
        expect(conflicts[1].options).toHaveLength(2);
        expect(conflicts[1].options.some(opt => opt.hash === hash1_2)).toBe(true);
        expect(conflicts[1].options.some(opt => opt.hash === hash2_2)).toBe(true);
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
                hash: generatePatchOptionHash('replace', '/name', 'Alice'),
            },
            {
                op: 'add',
                path: '/age',
                value: 30,
                hash: generatePatchOptionHash('add', '/age', 30),
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
                hash: generatePatchOptionHash('replace', '/name', 'Alice'),
            },
        ];

        const patches2: Patch[] = [];

        const conflicts = detectConflicts([patches1, patches2]);
        expect(conflicts.length).toBe(0);
    });

    it('should identify conflicts between different operation types', () => {
        const addHash = generatePatchOptionHash('add', '/users/0/profile', { age: 30 });
        const replaceHash = generatePatchOptionHash('replace', '/users/0/profile', { age: 25 });

        const patches1: Patch[] = [
            {
                op: 'add',
                path: '/users/0/profile',
                value: { age: 30 },
                hash: addHash,
            },
        ];

        const patches2: Patch[] = [
            {
                op: 'replace',
                path: '/users/0/profile',
                value: { age: 25 },
                hash: replaceHash,
            },
        ];

        const conflicts = detectConflicts([patches1, patches2]);
        expect(conflicts.length).toBe(1);
        expect(conflicts[0].path).toBe('/users/0/profile');

        // Check for different operation types in options
        expect(conflicts[0].options).toHaveLength(2);
        expect(conflicts[0].options.some(opt => opt.hash === addHash)).toBe(true);
        expect(conflicts[0].options.some(opt => opt.hash === replaceHash)).toBe(true);
    });

    it('should identify path prefix conflicts', () => {
        const parentHash = generatePatchOptionHash('replace', '/users/0', {
            name: 'Alice',
            age: 30,
        });
        const childHash = generatePatchOptionHash('replace', '/users/0/name', 'Bob');

        const patches1: Patch[] = [
            {
                op: 'replace',
                path: '/users/0',
                value: { name: 'Alice', age: 30 },
                hash: parentHash,
            },
        ];

        const patches2: Patch[] = [
            {
                op: 'replace',
                path: '/users/0/name',
                value: 'Bob',
                hash: childHash,
            },
        ];

        const conflicts = detectConflicts([patches1, patches2]);
        expect(conflicts.length).toBeGreaterThan(0);

        // 找到包含这两个哈希之一的冲突
        const hasConflict = conflicts.some(
            c =>
                c.options.some(opt => opt.hash === parentHash) ||
                c.options.some(opt => opt.hash === childHash)
        );
        expect(hasConflict).toBe(true);
    });

    it('should handle different paths without conflicts', () => {
        const patches1: Patch[] = [
            {
                op: 'replace',
                path: '/users/0/name',
                value: 'Alice',
                hash: generatePatchOptionHash('replace', '/users/0/name', 'Alice'),
            },
        ];

        const patches2: Patch[] = [
            {
                op: 'replace',
                path: '/users/1/name',
                value: 'Bob',
                hash: generatePatchOptionHash('replace', '/users/1/name', 'Bob'),
            },
        ];

        const conflicts = detectConflicts([patches1, patches2]);
        expect(conflicts.length).toBe(0);
    });

    it('should handle remove operation conflicts correctly', () => {
        const removeHash = generatePatchOptionHash('remove', '/users/0');
        const replaceHash = generatePatchOptionHash('replace', '/users/0/name', 'Alice');

        const patches1: Patch[] = [
            {
                op: 'remove',
                path: '/users/0',
                hash: removeHash,
            },
        ];

        const patches2: Patch[] = [
            {
                op: 'replace',
                path: '/users/0/name',
                value: 'Alice',
                hash: replaceHash,
            },
        ];

        const conflicts = detectConflicts([patches1, patches2]);
        expect(conflicts.length).toBeGreaterThan(0);
        expect(conflicts.some(c => c.path === '/users/0')).toBe(true);
        expect(conflicts.some(c => c.options.some(opt => opt.hash === removeHash))).toBe(true);
        expect(conflicts.some(c => c.options.some(opt => opt.hash === replaceHash))).toBe(true);
    });

    it('should identify complex conflicts in deeply nested structures', () => {
        const cityHash = generatePatchOptionHash(
            'replace',
            '/users/user123/addresses/0/city',
            'Beijing'
        );
        const zipcodeHash = generatePatchOptionHash(
            'replace',
            '/users/user123/addresses/0/zipcode',
            '100000'
        );
        const removeHash = generatePatchOptionHash('remove', '/users/user123/addresses/0');
        const addHash = generatePatchOptionHash('add', '/users/user123/addresses/1', {
            city: 'Shanghai',
            zipcode: '200000',
        });

        const patch1: Patch[] = [
            {
                op: 'replace',
                path: '/users/user123/addresses/0/city',
                value: 'Beijing',
                hash: cityHash,
            },
            {
                op: 'replace',
                path: '/users/user123/addresses/0/zipcode',
                value: '100000',
                hash: zipcodeHash,
            },
        ];

        const patch2: Patch[] = [
            {
                op: 'remove',
                path: '/users/user123/addresses/0',
                hash: removeHash,
            },
            {
                op: 'add',
                path: '/users/user123/addresses/1',
                value: {
                    city: 'Shanghai',
                    zipcode: '200000',
                },
                hash: addHash,
            },
        ];

        const conflicts = detectConflicts([patch1, patch2]);
        expect(conflicts.length).toBeGreaterThan(0);
        expect(
            conflicts.some(
                c =>
                    c.path === '/users/user123/addresses/0' ||
                    c.path === '/users/user123/addresses/0/city' ||
                    c.path === '/users/user123/addresses/0/zipcode'
            )
        ).toBe(true);
        expect(conflicts.some(c => c.options.some(opt => opt.hash === removeHash))).toBe(true);
        expect(
            conflicts.some(
                c =>
                    c.options.some(opt => opt.hash === cityHash) ||
                    c.options.some(opt => opt.hash === zipcodeHash)
            )
        ).toBe(true);
    });

    it('should not detect conflict when replacing whole object and updating a property with identical value', () => {
        const contactHash = generatePatchOptionHash('replace', '/contact-1', {
            id: 'contact-1',
            name: '张三(技术总监)',
            phone: '13888888888',
            email: 'zhangsan@newemail.com',
            tags: ['同事', '技术部', '管理层'],
            address: '北京市朝阳区',
        });
        const phoneHash = generatePatchOptionHash('replace', '/contact-1/phone', '13888888888');

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
                hash: contactHash,
            },
        ];

        const patch2: Patch[] = [
            {
                op: 'replace',
                path: '/contact-1/phone',
                value: '13888888888',
                hash: phoneHash,
            },
        ];

        const conflicts = detectConflicts([patch1, patch2]);
        expect(conflicts.length).toBe(0);
    });
});
