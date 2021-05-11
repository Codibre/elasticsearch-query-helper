import { and, between, gte, lte, or } from '../../src';

describe('parser.ts', () => {
	describe(and.name, () => {
		it('should return undefined when items length is zero', () => {
			const result = and([]);

			expect(result).toBeUndefined();
		});

		it('should return first item when items length is one', () => {
			const firstItem = { expected: 'value' };

			const result = and([firstItem]);

			expect(result).toBe(firstItem);
		});

		it('should return bool.should when items length is more than one', () => {
			const firstItem = { expected: 'value' };
			const secondItem = { expect: 'value2' };

			const result = and([firstItem, secondItem]);

			expect(result).toEqual({
				bool: {
					must: [firstItem, secondItem],
				},
			});
		});
	});

	describe(or.name, () => {
		it('should return undefined when items length is zero', () => {
			const result = or([]);

			expect(result).toBeUndefined();
		});

		it('should return first item when items length is one', () => {
			const firstItem = { expected: 'value' };

			const result = or([firstItem]);

			expect(result).toBe(firstItem);
		});

		it('should return bool.should when items length is more than one', () => {
			const firstItem = { expected: 'value' };
			const secondItem = { expect: 'value2' };

			const result = or([firstItem, secondItem]);

			expect(result).toEqual({
				bool: {
					should: [firstItem, secondItem],
				},
			});
		});
	});

	describe(gte.name, () => {
		it('should return undefined when value is undefined', () => {
			const result = gte('myField', undefined);

			expect(result).toBeUndefined();
		});

		it('should return range comparison when value is not undefined', () => {
			const result = gte('myField', 'myValue');

			expect(result).toEqual({
				range: {
					myField: {
						gte: 'myValue',
					},
				},
			});
		});
	});

	describe(lte.name, () => {
		it('should return undefined when value is undefined', () => {
			const result = lte('myField', undefined);

			expect(result).toBeUndefined();
		});

		it('should return range comparison when value is not undefined', () => {
			const result = lte('myField', 'myValue');

			expect(result).toEqual({
				range: {
					myField: {
						lte: 'myValue',
					},
				},
			});
		});
	});

	describe(between.name, () => {
		it('should return undefined when both values are undefined', () => {
			const result = between('myField', undefined, undefined);

			expect(result).toBeUndefined();
		});

		it('should return gte range comparison when just first value is not undefined', () => {
			const result = between('myField', 'myValue', undefined);

			expect(result).toEqual({
				range: {
					myField: {
						gte: 'myValue',
						lte: undefined,
					},
				},
			});
		});

		it('should return lte range comparison when just last value is not undefined', () => {
			const result = between('myField', undefined, 'myValue');

			expect(result).toEqual({
				range: {
					myField: {
						gte: undefined,
						lte: 'myValue',
					},
				},
			});
		});

		it('should return between range comparison when both values are not undefined', () => {
			const result = between('myField', 'myValue1', 'myValue2');

			expect(result).toEqual({
				range: {
					myField: {
						gte: 'myValue1',
						lte: 'myValue2',
					},
				},
			});
		});
	});
});
