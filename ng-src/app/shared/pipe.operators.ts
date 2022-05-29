import {
	Observable,
	MonoTypeOperatorFunction,
	OperatorFunction,
	of,
	combineLatest,
	timer,
	Subscription,
} from 'rxjs';
import {
	filter,
	distinctUntilChanged,
	tap,
	catchError,
	map,
	startWith,
	switchMap,
	takeWhile,
	switchMapTo,
} from 'rxjs/operators';

import { assertNotNull } from './util';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { IterableDifferFactory, NgZone } from '@angular/core';

/** Filter all null values from Observable stream */
export const filterNull = <T>() =>
	filter((val: T): val is NonNullable<T> => val != null && val != undefined);

export function isNonNullable<T>(val: T): val is NonNullable<T> {
	return !!val;
}

export function isNotNullArray<T extends any[]>(
	val: T
): val is { [K in keyof T]: NonNullable<T[K]> } {
	return val.every((el) => el !== null && el !== undefined);
}

export const filterNullArray = () => filter(isNotNullArray);

export const AssertNotNullOperator = <T>(
	msg?: string
): OperatorFunction<T, NonNullable<T>> =>
	map((val) => {
		assertNotNull(val, msg);
		return val;
	});

/** Filter all null values and only emit distinct values */
export const filteredDistinct =
	<T>(): OperatorFunction<T, NonNullable<T>> =>
	(source: Observable<T>): Observable<NonNullable<T>> =>
		source.pipe(filterNull<T>(), distinctUntilChanged<NonNullable<T>>());

export const httpUploadProgress =
	() =>
	<T>(source: Observable<HttpEvent<T>>) => {
		//convert event stream into upload porgress reporting observable
		return source.pipe(
			takeWhile((event) => event.type != HttpEventType.Response, true),
			filter(
				(event) =>
					event.type == HttpEventType.UploadProgress ||
					event.type == HttpEventType.Response
			),
			map((event) => {
				switch (event.type) {
					case HttpEventType.UploadProgress:
						return event.total ? Math.round((event.loaded / event.total) * 100) / 100 : 0;

					case HttpEventType.Response:
						return event.body;
				}
				throw new Error();
			}),
			distinctUntilChanged(),
			filterNull()
		);
	};

/**
 * Delay the subscription of given observable until given time
 */
export const delayUntil = <T>(obs$: Observable<T>, time: Date) => {
	const now = new Date();

	if (time.getTime() <= now.getTime()) {
		return obs$;
	} else {
		return timer(time.getTime() - now.getTime()).pipe(switchMapTo(obs$));
	}
};

/**
 * Following pipe operators will execute in the angular zone
 * @param ngZone
 */
export const runInNgZone = <T>(ngZone: NgZone) => {
	return (source: Observable<T>) =>
		new Observable<T>((observer) => {
			const subs = source.subscribe({
				next: (val) => ngZone.run(() => observer.next(val)),
				complete: () => ngZone.run(() => observer.complete()),
				error: (e) => ngZone.run(() => observer.error(e)),
			});

			return () => subs.unsubscribe();
		});
};

/**
 * This operator subscribes to given observable, then subscribes to array of observables emitted by that observable
 * When the array changes, only the changed observables are unsubscribed or subscribed accordingly
 * This is useful for doing multiple uploads in parallel, when the list of uploads can change at any time
 */
export const smartMerge = <T>(differFactory: IterableDifferFactory) => {
	const NONE = {} as const;
	return (source: Observable<Observable<T>[]>) =>
		new Observable<T[]>((observer) => {
			const differ = differFactory.create<Observable<T>>();

			let state: {
				obs: Observable<T>;
				subscription: Subscription | null;
				result: T | typeof NONE;
			}[] = [];

			const unsub = () => {
				state.forEach((obs) => obs.subscription?.unsubscribe());
			};

			const emit = () => {
				const res = state.map((s) => s.result);
				if (res.every((r) => r !== NONE)) observer.next(res as T[]);
			};

			const mainSubscription = source.subscribe({
				error: (e) => {
					observer.error(e);
				},
				complete: () => {
					observer.complete();
				},
				next: (observables) => {
					const diff = differ.diff(observables);

					diff?.forEachOperation(
						({ item: observable, currentIndex }, adjustedPreviousIndex) => {
							if (currentIndex != null && adjustedPreviousIndex != null) {
								//item was moved
								const obs = state[adjustedPreviousIndex];
								state = state.filter((_, i) => i != adjustedPreviousIndex);

								state.splice(currentIndex, 0, obs);
							} else if (adjustedPreviousIndex != null) {
								//item was removed
								state[adjustedPreviousIndex].subscription?.unsubscribe();
								state = state.filter((_, i) => i != adjustedPreviousIndex);
							} else if (currentIndex != null) {
								//item was added
								const obs = {
									obs: observable.pipe(
										tap({
											error: (e) => {
												observer.error(e);
											},
											next: (val) => {
												obs.result = val;
												emit();
											},
										})
									),
									result: NONE,
									subscription: null,
								};
								state.splice(currentIndex, 0, obs);
							}
						}
					);

					state.forEach((obs) => {
						if (obs.subscription === null) {
							obs.subscription = obs.obs.subscribe();
						}
					});

					emit();
				},
			});

			return () => {
				unsub();
				mainSubscription.unsubscribe();
			};
		});
};

/**
 * Log all values passing through Observable stream
 *
 * @param tag label for showing beside logs
 */
export const log = <T>(tag: string) =>
	tap<T>({
		next(value: T) {
			console.log(
				`%c[${tag}: Next]`,
				'background: #00BCD4; color: #fff; padding: 3px; font-size: 12px;',
				value
			);
		},
		error(error) {
			console.log(
				`%c[${tag}: Error]`,
				'background: #E91E63; color: #fff; padding: 3px; font-size: 12px;',
				error
			);
		},
		complete() {
			console.log(
				`%c[${tag}]: Complete`,
				'background: #009688; color: #fff; padding: 3px; font-size: 12px;'
			);
		},
	});
