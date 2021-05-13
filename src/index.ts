/* eslint-disable camelcase */

import { identity } from 'is-this-a-pigeon';
import { fluent, FluentIterable } from '@codibre/fluent-iterable';
import { Client } from '@elastic/elasticsearch';
import { Search } from '@elastic/elasticsearch/api/requestParams';

export type FilterList = (object | undefined)[];
export type OrderType = 'asc' | 'desc';
export type OrderField = [string, OrderType];

export interface RawTopResult<T> {
	tops: {
		hits: {
			hits: {
				_source: T;
			}[];
		};
	};
}

function andOr<T extends FilterList>(items: T, field: 'should' | 'must') {
	const values = items.filter(identity);
	switch (values.length) {
		case 0:
			return undefined;
		case 1:
			return values[0];
		default:
			return {
				bool: {
					[field]: values,
				},
			};
	}
}

/**
 * Returns an and filter (bool.must)
 * @param items the list of conditions
 * @returns The and filter
 */
export function and<T extends FilterList>(items: T) {
	return andOr(items, 'must');
}

/**
 * Returns an or filter (bool.should)
 * @param items the list of conditions
 * @returns The or filter
 */
export function or<T extends FilterList>(items: T) {
	return andOr(items, 'should');
}

/**
 * Returns a range filter with gte
 * @param field The field to be compared
 * @param value the lower value
 * @returns The gte filter
 */
export function gte<T extends string, V>(field: T, value: V) {
	return value
		? {
				range: {
					[field]: {
						gte: value,
					},
				},
		  }
		: undefined;
}

/**
 * Returns a range filter with lte
 * @param field The field to be compared
 * @param value the upper value
 * @returns The lte filter
 */
export function lte<T extends string, V>(field: T, value: V | undefined) {
	return value
		? {
				range: {
					[field]: {
						lte: value,
					},
				},
		  }
		: undefined;
}

/**
 * Returns a range filter with lt
 * @param field The field to be compared
 * @param value the upper value
 * @returns The lt filter
 */
export function lt<T extends string, V>(field: T, value: V | undefined) {
	return value
		? {
				range: {
					[field]: {
						lt: value,
					},
				},
		  }
		: undefined;
}

/**
 * Returns a range filter with gte and lte
 * @param field The field to be compared
 * @param from the lower value
 * @param to the upper value
 * @returns The between filter
 */
export function between<T extends string, V>(
	field: T,
	from: V | undefined,
	to: V | undefined,
) {
	if (!from && !to) {
		return undefined;
	}
	return {
		range: {
			[field]: {
				gte: from,
				lte: to,
			},
		},
	};
}

/**
 * Returns a filter of "in" comparison
 * @param field The field to be compared
 * @param values The list of accepted values
 * @returns The in filter
 */
export function isIn<T extends string, V>(field: T, values: V[] | undefined) {
	return values?.length
		? {
				terms: {
					[field]: values,
				},
		  }
		: undefined;
}

/**
 * Returns a filter of equals comparison
 * @param field The field to be compared
 * @param value the value to be compared
 * @returns The equality filter
 */
export function equals<T extends string, V>(field: T, value: V | undefined) {
	return isIn(field, [value]);
}

/**
 * Envelops a list of fields to be chosen
 * @param includes The fields to be chosen
 * @returns The enveloped object
 */
export function select<Fields extends string[]>(includes: Fields | undefined) {
	return includes
		? {
				includes,
		  }
		: undefined;
}

/**
 * Format a ordering object
 * @param orders the sequence of tuples of field and asc/desc, to defined the ordering
 * @returns the ordering object
 */
export function orderBy<
	Fields extends string,
	Orders extends [Fields, OrderType][],
>(orders: Orders) {
	return orders.map(
		([field, order]) =>
			({
				[field]: order,
			} as {
				[t in Fields]: OrderType;
			}),
	);
}

/**
 * Returns a tpp hit aggregate expression
 * @param size the number of items to be returned
 * @param sort The order to be applied. Must be a return of *orderBy* function
 * @param fields the fields to be returned. If not informed, all fields are returned
 * @returns the top hit aggregate object
 */
export function topHit<
	T extends string,
	Order extends {
		[field in T]: OrderType;
	}[],
	Fields extends string[],
>(size: number, sort: Order, fields?: Fields) {
	return {
		tops: {
			top_hits: {
				size,
				sort,
				_source: select(fields),
			},
		},
	};
}

/**
 * Returns a tpp hit aggregate expression of size 1
 * @param sort The order to be applied. Must be a return of *orderBy* function
 * @param fields the fields to be returned. If not informed, all fields are returned
 * @returns the top hit aggregate object of size 1
 */
export function lastHit<
	T extends string,
	Order extends {
		[field in T]: OrderType;
	}[],
	Fields extends string[],
>(sort: Order, fields?: Fields) {
	return topHit(1, sort, fields);
}

/**
 * Returns a min aggregate expression
 * @param field the field in question
 * @param alias the name for the aggregation
 * @returns the min aggregation
 */
export function min<T extends string>(field: T, alias: string) {
	return {
		[alias]: {
			min: {
				field,
			},
		},
	};
}

/**
 * Returns a grouping by term
 * @param field The field to be grouped
 * @param order The order to be applied. Can be a return of *orderBy* function, or simply a "asc" or "desc", if you want to order by the grouping term
 * @param size How many items must be returned
 * @param aggregate the inner aggregation to be made. This is where you specify the fields to be returned somehow
 * @returns the aggregate by painless script object;
 */
export function by<
	T extends string,
	Order extends OrderType | OrderField,
	Size extends number,
	AggName extends string,
	Agg extends {
		[aggName in AggName]: object;
	},
>(field: T, order: Order, size: Size, aggregate: Agg): Record<string, object> {
	return {
		[field]: {
			terms: {
				field,
				order:
					typeof order === 'string'
						? {
								_key: order,
						  }
						: {
								[order[0]]: order[1],
						  },
				size,
			},
			aggs: aggregate,
		},
	};
}

/**
 * Returns a grouping by painless script expression
 * @param field A Tuple where the fist element is the grouping name, and the second the grouping expression
 * @param order The order to be applied. Can be a return of *orderBy* function
 * @param size How many items must be returned
 * @param aggregate the inner aggregation to be made. This is where you specify the fields to be returned somehow
 * @returns the aggregate by painless script object;
 */
export function byExpr<
	T extends [string, string],
	Order extends OrderField,
	Size extends number,
	AggName extends string,
	Agg extends {
		[aggName in AggName]: object;
	},
>(field: T, order: Order, size: Size, aggregate: Agg): Record<string, object> {
	return {
		[field[0]]: {
			terms: {
				script: {
					source: field[1],
					lang: 'painless',
				},
				order: {
					[order[0]]: order[1],
				},
				size,
			},
			aggs: aggregate,
		},
	};
}

/**
 * Envelops a grouping query, with 0 results for non grouped items
 * @param aggs The aggregation to be enveloped. Must be a return of *By* function
 * @returns An enveloped grouping object
 */
export function group<By extends ReturnType<typeof by>>(aggs: By) {
	return {
		aggs,
		size: 0,
	};
}

/**
 * Envelops filter/query conditions
 * @param query the query to be enveloped
 * @returns the enveloped query or an empty object, when query is undefined
 */
export function where<Query extends object | undefined>(
	query: Query | undefined,
) {
	return query
		? {
				query,
		  }
		: {};
}

/**
 * Runs a top query hits and treat the result in a fancy way where you receive an iterable in steroids of the type you inform
 * @param client Elasticsearch client
 * @param params the search to be ran
 * @param topHitsAggregationName the name of the top aggregation
 * @returns The FluentIterable of T (please inform T when using this function for best experience)
 */
export async function runTopHitsQuery<T>(
	client: Client,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	params: Search<any>,
	topHitsAggregationName: string,
): Promise<FluentIterable<T>> {
	const response = await client.search(params);
	return fluent(response.body?.aggregations?.[topHitsAggregationName]?.buckets)
		.filter()
		.flatMap((x) => (x as RawTopResult<T>).tops.hits.hits)
		.map('_source');
}
