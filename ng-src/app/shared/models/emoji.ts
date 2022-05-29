import { Observable } from 'rxjs';

import EmojiRegex from 'emoji-regex';
export class Emoji {
	private readonly skinModifiers = [
		'\u{1f3fb}', // skin type 1-2
		'\u{1f3fc}', // skin type 3
		'\u{1f3fd}', // skin type 4
		'\u{1f3fe}', // skin type 5
		'\u{1f3ff}', // skin type 6
	];

	constructor(private _native: string) {
		if (!Emoji.isEmoji(_native)) throw 'Invalid Emoji';
	}

	get native() {
		return this._native;
	}

	get unified() {
		return this.toUnified(this._native);
	}

	get unifiedWithoutSkin() {
		let ans = this._native;
		for (const m of this.skinModifiers) {
			ans = ans.replace(m, '');
		}
		return this.toUnified(ans);
	}

	get skin() {
		const ind = this.skinModifiers.findIndex((m) => this.native.includes(m));
		if (ind == -1) return 1;
		else return (ind + 2) as 2 | 3 | 4 | 5 | 6;
	}

	private toUnified(n: string) {
		return Array.from(n)
			.map((e) => e.codePointAt(0)?.toString(16))
			.join('-')
			.toUpperCase();
	}

	static get regex() {
		return EmojiRegex();
	}

	/** Check wether given input string is a valid unicode emoji or not */
	static isEmoji(testString: string) {
		return typeof testString == 'string' && Emoji.regex.test(testString);
	}
}

export interface EmojiPicker {
	open: Observable<void>;
}
