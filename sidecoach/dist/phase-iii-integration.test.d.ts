declare global {
    function describe(name: string, fn: () => void): void;
    function test(name: string, fn: () => void): void;
    function beforeEach(fn: () => void): void;
    function expect(value: any): any;
    namespace jest {
        interface Matchers<R> {
            toBeDefined(): R;
            toBeUndefined(): R;
            toBe(expected: any): R;
            toEqual(expected: any): R;
            toBeGreaterThan(expected: number): R;
            toBeLessThan(expected: number): R;
            toBeGreaterThanOrEqual(expected: number): R;
            toBeLessThanOrEqual(expected: number): R;
        }
    }
}
export {};
//# sourceMappingURL=phase-iii-integration.test.d.ts.map