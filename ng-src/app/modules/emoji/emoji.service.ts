import { Injectable, Inject } from '@angular/core';

import { EmojiRegexService } from './emoji-regex.service';
import {
	EmojiService as NGXEmojiService,
	Emoji as EmojiData,
} from '@ctrl/ngx-emoji-mart/ngx-emoji';

import { Emoji } from '@models';
import { EMOJI_SET } from './emoji-set';
import { assertNotNull } from '@shared/util';

@Injectable({ providedIn: 'root' })
export class EmojiService {
	constructor(
		private emojiRegex: EmojiRegexService,
		@Inject(EMOJI_SET) private emojiSet: EmojiData['set'],
		private emojiMart: NGXEmojiService
	) {}

	/** Converts string containing emojis to array of tokens, which can be strings or emoji objects */
	TokenizeUnicodeEmoji(html: string) {
		const regex = this.emojiRegex.regex;
		const result: Array<string | Emoji> = [];
		let lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = regex.exec(html))) {
			result.push(html.substring(lastIndex, match.index));
			result.push(new Emoji(match[0]));
			lastIndex = match.index + match[0].length;
		}

		result.push(html.substr(lastIndex));
		return result;
	}

	/** Get sprite sheet styles for native emoji */
	getSpriteStyles(emoji: Emoji, sheetSize: EmojiData['sheetSize']) {
		const data = this.emojiMart.getData(
			emoji.unifiedWithoutSkin,
			emoji.skin,
			this.emojiSet
		);
		assertNotNull(data, 'Emoji Data not found');
		const styles = this.emojiMart.emojiSpriteStyles(
			data.sheet,
			this.emojiSet,
			20,
			sheetSize,
			57,
			this.backgroundFn
		);

		return {
			'background-image': styles['background-image'],
			'background-size': styles['background-size'],
			'background-position': styles['background-position'],
		};
	}

	searchEmojiByShortName(sName: string) {
		return this.emojiMart.emojis.filter(
			(e) =>
				e.shortName.startsWith(sName) || e.shortNames.some((n) => n.startsWith(sName))
		);
	}

	/** Converts string with ascii emojis to unicode */
	convertASCIIToEmoji(input: string) {
		return input
			.replace(/\sO:\)/g, ' \u{1F607}')
			.replace(/:\)/g, '\u{1F642}')
			.replace(/:D/g, '\u{1F603}')
			.replace(/:\(/g, '\u{1F61F}')
			.replace(/:[p]/g, '\u{1F61C}')
			.replace(/:[P]/g, '\u{1F61C}')
			.replace(/:\|/g, '\u{1F610}')
			.replace(/\([Yy]\)/g, '\u{1F44D}')
			.replace(/:\/(?!\/)/g, '\u{1F612}')
			.replace(/:\\(?!\/)/g, '\u{1F612}')
			.replace(/:\]/g, '\u{1F60F}')
			.replace(/xD/g, '\u{1F606}')
			.replace(/:o/g, '\u{1F62E}')
			.replace(/:O/g, '\u{1F631}')
			.replace(/:'\(/g, '\u{1F622}')
			.replace(/>_>/g, '\u{1F612}')
			.replace(/\^_\^/g, '\u{1F604}')
			.replace(/;\)/g, '\u{1F609}')
			.replace(/<3/g, '\u{2764}\u{FE0F}');
	}

	matchAsciiEmoji(input: string) {
		const regex = [
			/\sO:\)/g,
			/:\)/g,
			/:D/g,
			/:\(/g,
			/:[p]/g,
			/:[P]/g,
			/:\|/g,
			/\([Yy]\)/g,
			/:\/(?!\/)/g,
			/:\\(?!\/)/g,
			/:\]/g,
			/xD/g,
			/:o/g,
			/:O/g,
			/:'\(/g,
			/>_>/g,
			/\^_\^/g,
			/;\)/g,
			/<3/g,
		];

		const res = regex.find((r) => r.test(input));
		if (!res) {
			return null;
		}
		return input.match(res);
	}

	/** Checks if given html only contains emojis or not */
	isEmoji(html: string | HTMLElement): boolean {
		const c = typeof html == 'string' ? html : html.innerText;
		const regex = this.emojiRegex.regex;

		const trimmed = c.replace(/ /g, '');
		let length = 0;
		let match: string[] | null;
		while ((match = regex.exec(c))) {
			length += match[0].length;
		}

		return length == trimmed.length;
	}

	/** Function to get spritesheet */
	backgroundFn(set: string, sheetSize: number) {
		return `https://unpkg.com/emoji-datasource-${set}@6.0.1/img/${set}/sheets-256/${sheetSize}.png`;
	}
}
