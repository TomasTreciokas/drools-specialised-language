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
import { User } from '@models/user';
import { FroalaDirective } from './froala.directive';
import { filterNull, runInNgZone } from '@shared/pipe.operators';
import { EMPTY, merge, ReplaySubject, Subject, Subscription } from 'rxjs';
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
	pairwise,
} from 'rxjs/operators';
import { cmpRng } from '@shared/util';
import { UserQuery } from '../../user/store/user.query';

export interface MentionsDirectiveContext {
	users: Array<User & { selected: boolean }>;
	selectedIndex: number;
}

@Directive({
	selector: '[mentions]',
})
export class MentionsDirective implements OnInit, OnDestroy {
	@Input('mentions') set froalaDirective(val: FroalaDirective) {
		this.froalaDirective$.next(val);
	}

	@Input() mentionsOpenSubj: Subject<boolean>;

	@Input() mentionsAddUserIds = false;

	@Input() set mentionsUsers(u: User[]) {
		this._usersList$.next(u);
	}

	readonly _usersList$ = new ReplaySubject<User[]>(1);

	private readonly froalaDirective$ = new ReplaySubject<FroalaDirective>(1);
	private readonly subs = new Subscription();
	private readonly _addMentionExternal$ = new Subject<User>();
	private readonly upd$ = new Subject<void>();

	constructor(
		private vcRef: ViewContainerRef,
		private tpl: TemplateRef<MentionsDirectiveContext>,
		private zone: NgZone
	) {}

	readonly selection$ = this.froalaDirective$.pipe(
		switchMap((dir) =>
			merge(
				dir.contentChanged$,
				dir.focus$,
				dir.keyUp$.pipe(delay(10)),
				this.upd$.pipe(delay(10))
			).pipe(
				map(() => dir.froalaInstance?.selection.get()),
				scan(
					(r, s) => {
						if (!s) {
							return {
								emit: !!r.s,
								s: null,
								rng: null,
							};
						}
						if (!r.rng) {
							return {
								rng: s.rangeCount > 1 ? s.getRangeAt(0).cloneRange() : null,
								s: s,
								emit: true,
							};
						}
						return {
							rng: s.getRangeAt(0).cloneRange(),
							s: s,
							emit: !cmpRng(s.getRangeAt(0), r.rng),
						};
					},
					{
						rng: null as null | Range,
						emit: true,
						s: null as Selection | null,
					}
				),
				filter((v) => v.emit),
				map((v) => v.s)
			)
		)
	);

	readonly inEditorRange$ = this.selection$.pipe(
		withLatestFrom(this.froalaDirective$),
		scan((prev, [selection, dir]) => {
			if (dir.froalaInstance?.selection.inEditor()) {
				return selection?.getRangeAt(0).cloneRange() ?? null;
			} else return null;
		}, null as Range | null)
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

	readonly usersList$ = this.currentWord$.pipe(
		map((word) => (word ? word.substring(1) : null)),
		switchMap((word) =>
			word
				? this._usersList$.pipe(
						map((us) =>
							us.filter((u) =>
								u.userNameComplete.toLowerCase().includes(word.toLowerCase())
							)
						),
						first(),
						withLatestFrom(this.froalaDirective$),
						switchMap(([users, dir]) =>
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
											return users.length - 1;
										} else return nextInd;
									} else if (e.originalEvent.key == 'ArrowDown') {
										nextInd = prev + 1;
										if (nextInd >= users.length) {
											return 0;
										} else return nextInd;
									}
									return prev;
								}, 0),
								startWith(0),
								map((i) => ({
									users: users.map((u, index) => ({ ...u, selected: index == i })),
									selectedIndex: i,
								}))
							)
						)
				  )
				: EMPTY
		),
		shareReplay({ refCount: true, bufferSize: 1 })
	);

	readonly shouldShowMentions$ = this.currentWord$.pipe(
		map((text) => !!text && /^@\w+/.test(text)),
		distinctUntilChanged(),
		tap((show) => this.mentionsOpenSubj.next(show))
	);

	readonly showMentions$ = this.shouldShowMentions$.pipe(
		scan((ref, show) => {
			if (show) {
				return this.vcRef.createEmbeddedView(this.tpl, { users: [], selectedIndex: 0 });
			} else {
				ref?.destroy();
				return null;
			}
		}, null as EmbeddedViewRef<MentionsDirectiveContext> | null),
		switchMap((ref) =>
			ref
				? this.usersList$.pipe(
						runInNgZone(this.zone),
						tap(({ users, selectedIndex }) => {
							ref.context.users = users;
							ref.context.selectedIndex = selectedIndex;
							ref.markForCheck();
						})
				  )
				: EMPTY
		)
	);

	readonly addMention$ = this.shouldShowMentions$.pipe(
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
								this._addMentionExternal$.pipe(map((u) => ({ type: 'u' as const, u })))
							).pipe(
								withLatestFrom(
									this.currentWord$,
									this.usersList$,
									this.inEditorRange$.pipe(filterNull())
								),
								tap(([e, word, users, r]) => {
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
										const text = s.focusNode?.textContent;
										if (!text) {
											return null;
										}
										const currentIndex = s.focusOffset;
										let startIndex = currentIndex - 1;
										while (startIndex >= 0 && !/\s/.test(text[startIndex])) startIndex--;
										startIndex++;
										let endIndex = currentIndex - 1;
										while (endIndex < text.length && !/\s/.test(text[endIndex]))
											endIndex++;

										const r = s.getRangeAt(0);
										if (s.focusNode) {
											r.setStart(s.focusNode, startIndex);
											r.setEnd(s.focusNode, endIndex);

											const user = e.type == 'u' ? e.u : users.users[users.selectedIndex];

											fr.html.insert(
												`<span contenteditable="false" ${
													this.mentionsAddUserIds ? `data-userId=${user.userId}` : ''
												}  class="tag" >@${user.userNameComplete}</span> `
											);
										}
									}

									this.upd$.next();

									return null;
								})
							)
						)
				  )
				: EMPTY
		)
	);

	readonly deleteMention$ = this.froalaDirective$.pipe(
		switchMap((dir) =>
			dir.keyDown$.pipe(
				map((e) => {
					const s = dir.froalaInstance?.selection.get();
					const rng = (s?.rangeCount ?? 0) > 0 ? s?.getRangeAt(0).cloneRange() : null;
					const content = dir.froalaInstance?.html.get();
					return {
						e,
						rng,
						content,
					};
				}),
				pairwise(),
				tap(([prev, curr]) => {
					if (
						prev.e.originalEvent.key == 'Backspace' &&
						curr.e.originalEvent.key == 'Backspace' &&
						prev.content == curr.content &&
						cmpRng(prev.rng, curr.rng)
					) {
						const fr = dir.froalaInstance;
						const s = fr?.selection.get();

						if (s && fr && s.focusNode) {
							const isMentionEl = (n: Node): n is HTMLSpanElement => {
								return (
									n.nodeType == Node.ELEMENT_NODE &&
									n.nodeName == 'SPAN' &&
									(n as Element).classList.contains('tag')
								);
							};
							let lastChild: Element | null = null;
							if (
								s.focusOffset > 0 &&
								s.focusNode.nodeType == Node.ELEMENT_NODE &&
								s.focusNode.childNodes[s.focusOffset - 1] &&
								isMentionEl(s.focusNode.childNodes[s.focusOffset - 1])
							) {
								lastChild = s.focusNode.childNodes[s.focusOffset - 1] as HTMLSpanElement;
							}
							if (lastChild) {
								s.getRangeAt(0).selectNode(lastChild);
								fr.html.insert('');
								return;
							}
						}
					}
				})
			)
		)
	);

	ngOnInit() {
		this.subs.add(this.showMentions$.subscribe());
		this.subs.add(this.addMention$.subscribe());
		this.subs.add(this.deleteMention$.subscribe());
	}

	ngOnDestroy() {
		this.subs.unsubscribe();
	}

	static ngTemplateContextGuard(
		dir: MentionsDirective,
		ctx: unknown
	): ctx is MentionsDirectiveContext {
		return true;
	}

	public addMention(user: User) {
		this._addMentionExternal$.next(user);
	}
}

@Directive({
	selector: '[mentionItem]',
})
export class MentionItemDirective {
	@Input('mentionItem') user: User;
	@Input() set selected(val: boolean) {
		if (val) {
			(this.el.nativeElement as any).scrollIntoViewIfNeeded();
		}
	}

	constructor(
		private mentionDir: MentionsDirective,
		private el: ElementRef<HTMLElement>
	) {}

	@HostListener('click')
	addMention() {
		this.mentionDir.addMention(this.user);
	}
}
