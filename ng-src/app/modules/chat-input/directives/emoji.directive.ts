import {
	Directive,
	ElementRef,
	EmbeddedViewRef,
	HostListener,
	Input,
	NgZone,
	OnDestroy,
	OnInit,
	TemplateRef,
	ViewContainerRef,
} from '@angular/core';
import { EmojiData } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import { Emoji } from '@models';
import { EmojiService } from '@modules/emoji/emoji.service';
import { FroalaDirective } from '@modules/froala/directives/froala.directive';
import { bind } from '@shared/decorators/bind';
import { filterNull, runInNgZone } from '@shared/pipe.operators';
import FroalaEditor from 'froala-editor';
import {
	combineLatest,
	defer,
	EMPTY,
	merge,
	of,
	ReplaySubject,
	Subject,
	Subscription,
} from 'rxjs';
import {
	switchMap,
	map,
	delay,
	distinctUntilChanged,
	withLatestFrom,
	startWith,
	scan,
	tap,
	first,
	shareReplay,
	filter,
	exhaustMap,
	pairwise,
	debounceTime,
} from 'rxjs/operators';
import { growSelectionToWord } from './util';

export interface EmojiDirectiveContext {
	emojis: Array<EmojiData & { selected: boolean }>;
}

@Directive({
	selector: '[froalaEmoji]',
	exportAs: 'froalaEmojiDir',
})
export class EmojiDirective implements OnInit, OnDestroy {
	@Input('froalaEmoji') set froalaDirective(val: FroalaDirective) {
		this.froalaDirective$.next(val);
	}

	@Input() froalaEmojiOpenSubj: Subject<boolean>;

	private readonly froalaDirective$ = new ReplaySubject<FroalaDirective>(1);
	private readonly subs = new Subscription();
	private readonly _addEmojiExternal = new Subject<EmojiData>();
	private readonly upd$ = new Subject<void>();

	constructor(
		private vcRef: ViewContainerRef,
		private tpl: TemplateRef<EmojiDirectiveContext>,
		private emojiService: EmojiService,
		private zone: NgZone
	) {}

	readonly selection$ = this.froalaDirective$.pipe(
		switchMap((dir) =>
			merge(
				dir.contentChanged$,
				dir.keyUp$.pipe(delay(10)),
				this.upd$.pipe(delay(10))
			).pipe(map(() => dir.froalaInstance?.selection.get()))
		)
	);

	readonly inEditorRange$ = this.selection$.pipe(
		withLatestFrom(this.froalaDirective$),
		scan((prev, [selection, dir]) => {
			if (dir.froalaInstance?.selection.inEditor()) {
				return selection?.getRangeAt(0) ?? null;
			} else return null;
		}, null as Range | null),
		filterNull(),
		shareReplay({ refCount: true, bufferSize: 1 })
	);

	readonly currentWord$ = this.selection$.pipe(
		map((sel) => {
			//return null if the user is actually selecting some text
			if (sel?.focusNode !== sel?.anchorNode || sel?.anchorOffset !== sel?.focusOffset)
				return null;
			if (sel?.focusNode?.nodeType == 3) {
				const text = sel.focusNode.textContent;
				if (!text) {
					return null;
				}
				const currentIndex = sel.focusOffset;
				let startIndex = currentIndex - 1;
				while (startIndex >= 0 && !/\s/.test(text[startIndex])) startIndex--;
				startIndex++;
				let endIndex = currentIndex - 1;
				while (endIndex < text.length && !/\s/.test(text[endIndex])) endIndex++;
				return text.substring(startIndex, endIndex);
			}
			return null;
		}),
		distinctUntilChanged(),
		shareReplay({ refCount: true, bufferSize: 1 })
	);

	readonly emojisList$ = this.currentWord$.pipe(
		map((word) => (word ? word.substring(1) : null)),
		switchMap((word) =>
			word
				? defer(() => of(this.emojiService.searchEmojiByShortName(word))).pipe(
						first(),
						withLatestFrom(this.froalaDirective$),
						switchMap(([emojis, dir]) =>
							dir.keyDown$.pipe(
								filter(
									(e) =>
										e.originalEvent.key == 'ArrowUp' || e.originalEvent.key == 'ArrowDown'
								),
								tap((e) => {
									e.originalEvent.stopImmediatePropagation();
									e.originalEvent.preventDefault();
								}),
								scan((prev, e) => {
									let nextInd: number;
									if (e.originalEvent.key == 'ArrowUp') {
										nextInd = prev - 1;
										if (nextInd < 0) {
											return emojis.length - 1;
										} else return nextInd;
									} else if (e.originalEvent.key == 'ArrowDown') {
										nextInd = prev + 1;
										if (nextInd >= emojis.length) {
											return 0;
										} else return nextInd;
									}
									return prev;
								}, 0),
								startWith(0),
								map((i) => ({
									emojis: emojis.map((u, index) => ({ ...u, selected: index == i })),
									selectedIndex: i,
								}))
							)
						)
				  )
				: EMPTY
		),
		shareReplay({ refCount: true, bufferSize: 1 })
	);

	readonly shouldShowEmojis$ = this.currentWord$.pipe(
		map((text) => !!text && /^:\S{2,}/.test(text)),
		distinctUntilChanged(),
		tap((show) => this.froalaEmojiOpenSubj.next(show))
	);

	readonly showEmojis = this.shouldShowEmojis$.pipe(
		scan((ref, show) => {
			if (show) {
				return this.vcRef.createEmbeddedView(this.tpl, { emojis: [] });
			} else {
				ref?.destroy();
				return null;
			}
		}, null as EmbeddedViewRef<EmojiDirectiveContext> | null),
		switchMap((ref) =>
			ref
				? this.emojisList$.pipe(
						runInNgZone(this.zone),
						tap(({ emojis }) => {
							// console.log(users);
							ref.context.emojis = emojis;
							// ref.context.selectedIndex = selectedIndex;
							ref.markForCheck();
						})
				  )
				: EMPTY
		)
	);

	readonly addEmoji$ = this.shouldShowEmojis$.pipe(
		switchMap((show) =>
			show
				? this.froalaDirective$.pipe(
						switchMap((dir) =>
							merge(
								dir.keyDown$.pipe(
									filter(
										(e) => e.originalEvent.key == 'Enter' || e.originalEvent.key == 'Tab'
									),
									map((e) => ({ type: 'e' as const, e }))
								),
								this._addEmojiExternal.pipe(map((u) => ({ type: 'u' as const, u })))
							).pipe(
								withLatestFrom(
									this.currentWord$,
									this.emojisList$,
									this.inEditorRange$.pipe(filterNull())
								),
								tap(([e, word, emojis, r]) => {
									if (e.type == 'e' && e.e.originalEvent.key == 'Tab') {
										e.e.originalEvent.preventDefault();
										e.e.originalEvent.stopImmediatePropagation();
									}
									const fr = dir.froalaInstance;
									const s = fr?.selection.get();
									s?.removeAllRanges();
									s?.addRange(r);

									if (fr && word && s) {
										//Get the selection (cursor position) and grow it to the full word
										const [startIndex, endIndex] = growSelectionToWord(s) ?? [-1, -1];
										if (startIndex == -1) {
											return null;
										}

										const r = s.getRangeAt(0);
										if (s.focusNode) {
											r.setStart(s.focusNode, startIndex);
											r.setEnd(s.focusNode, endIndex);

											this.insertEmoji(
												(e.type == 'u'
													? e.u.native
													: emojis.emojis[emojis.selectedIndex].native) ?? '',
												fr
											);
										}
									}

									this.upd$.next();
								})
							)
						)
				  )
				: EMPTY
		)
	);

	readonly convertAsciiToEmoji$ = this.currentWord$.pipe(
		map((w) => {
			if (w && w.trim().length == 0) {
				return null;
			}
			return w;
		}),
		filterNull(),
		distinctUntilChanged((a, b) => a == b || a.trim() == b?.trim()),
		pairwise(),
		filter(([prev, curr]) => curr.length - prev.length == 1),
		map(([, curr]) => curr),
		withLatestFrom(this.froalaDirective$),
		exhaustMap(([w, dir]) => {
			const s = dir.froalaInstance?.selection.get();
			if (!w || !s || !dir.froalaInstance || !s.focusNode) return EMPTY;
			const match = this.emojiService.matchAsciiEmoji(w);
			if (!match || match.length == 0) return EMPTY;

			const em = this.emojiService.convertASCIIToEmoji(w);

			const [startIndex, endIndex] = growSelectionToWord(s) ?? [-1, -1];

			if (startIndex == -1) {
				return EMPTY;
			}

			const r = s.getRangeAt(0);

			r.setStart(s.focusNode, startIndex);
			r.setEnd(s.focusNode, endIndex);

			this.insertEmoji(em, dir.froalaInstance);

			return dir.keyDown$.pipe(
				first(),
				filter((e) => e.originalEvent.key == 'Backspace'),
				tap(() => {
					const lastChild = s.focusNode?.lastChild;
					if (
						lastChild &&
						lastChild.nodeType == 1 &&
						lastChild.nodeName == 'IMG' &&
						(lastChild as Element).classList.contains('emoji-img')
					) {
						s.getRangeAt(0).selectNode(lastChild);
					}
					dir.froalaInstance?.html.insert(w + ' ');
				})
			);
		})
	);

	private readonly convertEmojiToImg$ = this.froalaDirective$.pipe(
		switchMap((dir) =>
			dir.input$.pipe(
				filter((e) => !!e.originalEvent.data && Emoji.isEmoji(e.originalEvent.data)),
				debounceTime(10),
				tap((e) => {
					const s = dir.froalaInstance?.selection.get();

					if (
						s &&
						s.focusNode &&
						s.focusNode.nodeType == 3 &&
						s.focusNode.textContent &&
						e.originalEvent.data &&
						dir.froalaInstance
					) {
						const ind = s.focusNode.textContent.lastIndexOf(e.originalEvent.data);
						const r = s.getRangeAt(0);
						r.setStart(s.focusNode, ind);
						r.setEnd(s.focusNode, ind + e.originalEvent.data.length);
						this.insertEmoji(e.originalEvent.data, dir.froalaInstance);
					}
				})
			)
		)
	);

	private readonly handlePasted$ = this.froalaDirective$.pipe(
		switchMap((dir) =>
			dir.pasteAfterCleanup$.pipe(
				tap((ev) => {
					//"parse" the html as a child of the container element
					const container = document.createElement('div');
					container.innerHTML = ev.data;
					this.convertHtmlEmojisToImg(container);
					ev.data = container.innerHTML;
					ev.modify = true;
				})
			)
		)
	);

	ngOnInit() {
		this.froalaDirective$
			.pipe(
				first(),
				tap((dir) => {
					dir.registerInputTransformer(this.inputTransformer);
					dir.registerOutputTransformer(this.outputTransformer);
				})
			)
			.subscribe();

		this.subs.add(this.showEmojis.subscribe());
		this.subs.add(this.addEmoji$.subscribe());
		this.subs.add(this.convertAsciiToEmoji$.subscribe());
		this.subs.add(this.convertEmojiToImg$.subscribe());
		this.subs.add(this.handlePasted$.subscribe());
	}

	ngOnDestroy() {
		this.subs.unsubscribe();
	}

	static ngTemplateContextGuard(
		dir: EmojiDirective,
		ctx: unknown
	): ctx is EmojiDirectiveContext {
		return true;
	}

	addEmoji(em: string) {
		combineLatest([this.froalaDirective$])
			.pipe(
				first(),
				tap(([dir]) => {
					if (dir.froalaInstance) this.insertEmoji(em, dir.froalaInstance);
				})
			)
			.subscribe();
	}

	@bind
	private convertHtmlEmojisToImg(html: Node) {
		if (html.nodeType == 3 && html.textContent) {
			let match: RegExpExecArray | null;
			while ((match = Emoji.regex.exec(html.textContent)) !== null) {
				const ind = match.index;
				const secondIndex = ind + match[0].length;

				const imgEl = this.createEmojiImgEl(match[0]);
				html.parentNode?.insertBefore(imgEl, html);

				const textNode = document.createTextNode(html.textContent.substring(0, ind));
				html.parentNode?.insertBefore(textNode, imgEl);

				html.textContent = html.textContent?.substring(secondIndex);
			}
		}

		html.childNodes.forEach((child) => {
			this.convertHtmlEmojisToImg(child);
		});
	}

	@bind
	private convertHtmlImgToEmoji(html: Node) {
		if (
			html.nodeType == Node.ELEMENT_NODE &&
			html.nodeName == 'IMG' &&
			Emoji.isEmoji((html as HTMLImageElement).dataset['emoji'] ?? '')
		) {
			const textNode = document.createTextNode(
				(html as HTMLImageElement).dataset['emoji'] ?? ''
			);
			(html as HTMLImageElement).replaceWith(textNode);
		}

		html.childNodes.forEach((child) => {
			this.convertHtmlImgToEmoji(child);
		});
	}

	@bind
	private inputTransformer(inStr: string) {
		const el = document.createElement('div');
		el.innerHTML = inStr;
		this.convertHtmlEmojisToImg(el);
		return el.innerHTML;
	}

	@bind
	private outputTransformer(inStr: string) {
		const el = document.createElement('div');
		el.innerHTML = inStr;
		this.convertHtmlImgToEmoji(el);
		return el.innerHTML;
	}

	private createEmojiImgEl(em: string) {
		const styles = this.emojiService.getSpriteStyles(new Emoji(em), 64);
		const imgEl = document.createElement('img');
		imgEl.classList.add('emoji-img');
		imgEl.style.backgroundImage = styles['background-image'];
		imgEl.style.backgroundSize = styles['background-size'];
		imgEl.style.backgroundPosition = styles['background-position'];
		imgEl.dataset['emoji'] = em;

		return imgEl;
	}

	private insertEmoji(em: string, fr: FroalaEditor, rng?: Range) {
		const emoji = em;
		try {
			const html = document.createElement('div');

			const imgEl = this.createEmojiImgEl(emoji);
			imgEl.dataset['emoji'] = emoji;
			// imgEl.alt = emoji;
			html.appendChild(imgEl);

			if (rng) {
				const s = fr.selection.get();
				s.removeAllRanges();
				s.addRange(rng);
			}

			if (fr.core.isEmpty()) {
				fr.html.set(html.innerHTML);
			} else {
				fr.html.insert(html.innerHTML);
			}

			fr.events.trigger('contentChanged');
		} catch (e) {
			console.error('Couldnt convert to emoji');
		}
	}
}

@Directive({
	selector: '[froalaEmojiItem]',
})
export class FroalaEmojiItemDirective {
	@Input('froalaEmojiItem') emoji: EmojiData;
	@Input() set selected(val: boolean) {
		if (val) {
			(this.el.nativeElement as any).scrollIntoViewIfNeeded();
		}
	}

	constructor(private emojiDir: EmojiDirective, private el: ElementRef<HTMLElement>) {}

	@HostListener('click')
	addMention() {
		if (this.emoji.native) this.emojiDir.addEmoji(this.emoji.native);
	}
}
