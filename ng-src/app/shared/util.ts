export function assertNotNull<T>(val: T, msg?: string): asserts val is NonNullable<T> {
	if (val == undefined || val == null) throw new Error(msg ?? 'Null Assertion Failed!');
}

export function getFilesFromDataTransfer(data: DataTransfer | null): File[] {
	if (!data) return [];
	const result: File[] = [];
	if (data.items) {
		for (let i = 0; i < data.items.length; i++) {
			const item = data.items[i].getAsFile();
			if (item && item.size > 0) {
				//ignore folders
				result.push(item);
			}
		}
	}
	return result;
}

export function IsNotEmptyObject<T extends {}>(val: {} | T): val is T {
	return !(Object.keys(val).length === 0 && val.constructor === Object);
}

export function arrayEq<T>(arr1: T[], arr2: T[]) {
	if (arr1.length != arr2.length) return false;
	for (let i = 0; i < arr1.length; i++) {
		if (arr1[i] !== arr2[i]) return false;
	}

	return true;
}

export function nullIfEmptyString(val: string | null): string | null {
	return val?.length == 0 ? null : val;
}

export function generateGuid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = (Math.random() * 16) | 0,
			v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

export type NullableExcept<T, E extends keyof T, L = Omit<T, E>, U = Pick<T, E>> = {
	[K in keyof L]: L[K] | null;
} & { [K in keyof U]: U[K] };

export function setEq<T>(a: Set<T>, b: Set<T>) {
	if (a === b) {
		return true;
	}
	if (a.size != b.size) {
		return false;
	}
	for (const val of a.values()) {
		if (!b.has(val)) {
			return false;
		}
	}
	return true;
}

export function pluckKeys<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
	return Object.entries(obj)
		.filter(([k]) => keys.includes(k as K))
		.reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {} as Pick<T, K>);
}

export function onceEventToPromise<T extends Event>(emitter: EventTarget, event: string) {
	return new Promise<T>((res) => {
		emitter.addEventListener(
			event,
			(e) => {
				res(e as T);
			},
			{
				once: true,
			}
		);
	});
}


export function cmpRng(a: Range | null | undefined, b: Range | null | undefined) {
	if ((a == null || a == undefined) && (b == null || b == undefined)) {
		return true;
	}
	const ret =
		!!a &&
		!!b &&
		a.startContainer === b.startContainer &&
		a.startOffset === b.startOffset &&
		a.endContainer === b.endContainer &&
		a.endOffset === b.endOffset;
	return ret;
}
