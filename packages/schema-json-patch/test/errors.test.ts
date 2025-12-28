import { describe, it, expect } from 'vitest';
import { SchemaJsonPatchError, ErrorCode } from '../src/errors';

describe('SchemaJsonPatchError', () => {
    describe('constructor', () => {
        it('should create error with code and message', () => {
            const error = new SchemaJsonPatchError(ErrorCode.INVALID_PATH, 'Test message');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(SchemaJsonPatchError);
            expect(error.code).toBe(ErrorCode.INVALID_PATH);
            expect(error.message).toContain('Test message');
            expect(error.path).toBeUndefined();
        });

        it('should create error with path', () => {
            const error = new SchemaJsonPatchError(
                ErrorCode.INVALID_PATH,
                'Test message',
                '/user/name'
            );

            expect(error.code).toBe(ErrorCode.INVALID_PATH);
            expect(error.path).toBe('/user/name');
            expect(error.message).toContain('/user/name');
        });
    });

    describe('static factory methods', () => {
        it('should create invalidPath error', () => {
            const error = SchemaJsonPatchError.invalidPath('/invalid', 'custom detail');

            expect(error.code).toBe(ErrorCode.INVALID_PATH);
            expect(error.path).toBe('/invalid');
        });

        it('should create schemaMismatch error', () => {
            const error = SchemaJsonPatchError.schemaMismatch('object', 'array', '/data');

            expect(error.code).toBe(ErrorCode.SCHEMA_MISMATCH);
            expect(error.message).toContain('object');
            expect(error.message).toContain('array');
        });

        it('should create missingPrimaryKey error', () => {
            const error = SchemaJsonPatchError.missingPrimaryKey('id', '/users/0');

            expect(error.code).toBe(ErrorCode.MISSING_PRIMARY_KEY);
            expect(error.message).toContain('id');
        });

        it('should create unsupportedOperation error', () => {
            const error = SchemaJsonPatchError.unsupportedOperation('move');

            expect(error.code).toBe(ErrorCode.UNSUPPORTED_OPERATION);
            expect(error.message).toContain('move');
        });

        it('should create invalidJson error', () => {
            const error = SchemaJsonPatchError.invalidJson('Unexpected token');

            expect(error.code).toBe(ErrorCode.INVALID_JSON);
        });

        it('should create invalidSchema error', () => {
            const error = SchemaJsonPatchError.invalidSchema('missing $type');

            expect(error.code).toBe(ErrorCode.INVALID_SCHEMA);
        });
    });
});
