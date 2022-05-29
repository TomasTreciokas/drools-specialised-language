import { Directive, Input, HostBinding, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';

import { EmojiRegexService } from '../emoji-regex.service';
import { EmojiService } from '../emoji.service';
import { Emoji } from '@models';

/**
 * Directive to render a given emoji using background image properties for any element
 */
@Directive({
	selector: '[emoji]',
	providers: [],
})
export class EmojiDirective implements OnInit, OnDestroy {
	@Input()
	set emoji(val: string | Emoji) {
		this.emoji$.next(val);
	}

	@HostBinding('style.background-image') backgroundImage: string;
	@HostBinding('style.background-size') backgroundSize: string;
	@HostBinding('style.background-position') backgroundPosition: string;

	private readonly subscriptions = new Subscription();
	private readonly emoji$ = new BehaviorSubject<string | Emoji>('');

	/** Check wether input emoji is valid or not */
	private readonly validatedEmoji$ = this.emoji$.pipe(
		filter(
			(emoji) =>
				!!emoji &&
				(typeof emoji != 'string' ||
					(emoji.length > 0 && this.emojiRegex.regex.test(emoji)))
		),
		map((emoji) => (typeof emoji == 'string' ? new Emoji(emoji) : emoji))
	);

	private readonly setStyles$ = this.validatedEmoji$.pipe(
		map((emoji) => this.emojiService.getSpriteStyles(emoji, 64)),
		tap((styles) => {
			this.backgroundImage = styles['background-image'];
			this.backgroundPosition = styles['background-position'];
			this.backgroundSize = styles['background-size'];
		})
	);

	constructor(
		private emojiRegex: EmojiRegexService,
		private emojiService: EmojiService
	) {}

	ngOnInit() {
		this.subscriptions.add(this.setStyles$.subscribe());
	}

	ngOnDestroy() {
		this.subscriptions.unsubscribe();
	}
}
