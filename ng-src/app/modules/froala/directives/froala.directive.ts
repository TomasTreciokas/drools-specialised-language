import { ChangeDetectorRef, NgZone, OnDestroy } from '@angular/core';
import { Directive, ElementRef } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import FroalaEditor, { CtorOptions, PasteEvent } from 'froala-editor';
import { Subject } from 'rxjs';

export type Options = CtorOptions & {
	alternateNewline?: boolean;
};

export type InputTransformer = (inString: string) => string;
export type OutputTransformer = (outString: string) => string;

@Directive({
	selector: '[froala]',
})
export class FroalaDirective implements ControlValueAccessor, OnDestroy {
	protected froala: FroalaEditor | null;
	protected froalaEl: ElementRef | null;

	hasFocus = false;

	private currValue: string | null = null;
	private initialized = -1;
	private lastOut = '';
	private lastRange: Range | null = null;

	private readonly inputTransformers: InputTransformer[] = [
		// (inStr: string) => {
		// 	const el = document.createElement('div');
		// },
	];
	private readonly outputTransformers: OutputTransformer[] = [];

	/** Events: */
	readonly keyUp$ = new Subject<{ originalEvent: KeyboardEvent }>();
	readonly keyDown$ = new Subject<{ originalEvent: KeyboardEvent }>();
	readonly keypress$ = new Subject<{ originalEvent: KeyboardEvent }>();
	readonly input$ = new Subject<{ originalEvent: InputEvent }>();
	readonly contentChanged$ = new Subject<void>();
	readonly pasteAfterCleanup$ = new Subject<PasteEvent>();
	readonly pasteBeforeCleanup$ = new Subject<PasteEvent>();
	readonly focus$ = new Subject<void>();

	constructor(protected zone: NgZone, protected cd: ChangeDetectorRef) {}

	get froalaInstance() {
		return this.froala;
	}

	protected initEditor(el: ElementRef, options: Partial<Options>) {
		this.froalaEl = el;
		const baseOptions: Partial<CtorOptions> = {
			events: {
				contentChanged: () => {
					this.updateModel();
					this.saveRange();
				},
				'paste.afterCleanup': (e) => {
					const ev: PasteEvent = {
						data: e,
					};
					this.pasteAfterCleanup$.next(ev);
					if (ev.modify) {
						return ev.data;
					}
				},
				'paste.beforeCleanup': (e) => {
					const ev: PasteEvent = {
						data: e,
					};
					this.pasteBeforeCleanup$.next(ev);
					if (ev.modify) {
						return ev.data;
					}
				},
				blur: () => this.blur(),
				initialized: () => this.froalaInitialized(),
				focus: () => {
					this.focus();
					this.saveRange();
					this.focus$.next();
				},
				input: (e) => {
					this.input$.next(e);
					this.saveRange();
				},
				keyup: (e) => {
					this.keyUp$.next(e);
					this.updateModel();
					this.saveRange();
					if (e.originalEvent.defaultPrevented) return false;
					return true;
				},
				keydown: (e) => {
					this.keyDown$.next(e);
					this.saveRange();
					if (
						e.originalEvent.defaultPrevented &&
						(options.multiLine || options.multiLine === undefined)
					) {
						this.updateModel();
						return false;
					}
					if (
						options.alternateNewline &&
						e.originalEvent.key == 'Enter' &&
						e.originalEvent.shiftKey
					) {
						this.froala?.cursor.enter();
					}
					this.updateModel();
					return true;
				},
				keypress: (e) => this.keypress$.next(e),
			},
		};
		this.zone.runOutsideAngular(() => {
			this.froala = new FroalaEditor(el.nativeElement, {
				...baseOptions,
				...options,
				events: {
					...baseOptions.events,
					...options.events,
				},
			});
		});
	}

	registerInputTransformer(...tr: InputTransformer[]) {
		this.inputTransformers.push(...tr);
	}

	registerOutputTransformer(...tr: OutputTransformer[]) {
		this.outputTransformers.push(...tr);
	}

	protected onTouched: null | (() => void) = null;
	protected onChanged: null | ((val: string) => void) = null;

	writeValue(value: string) {
		this.setModel(value);
	}

	registerOnChange(fn: any) {
		this.onChanged = fn;
	}

	registerOnTouched(fn: any) {
		this.onTouched = fn;
	}

	setOptions(opts: Partial<CtorOptions>) {
		if (this.froala && this.froalaEl) {
			this.froala.destroy();
			this.initEditor(this.froalaEl, opts);
		}
	}

	ngOnDestroy() {
		this.zone.runOutsideAngular(() => {
			this.froala?.destroy();
		});
	}

	/** Focus editor and restore cursor to last position */
	restoreFocus() {
		const r = this.lastRange?.cloneRange();
		this.froalaInstance?.events.focus();
		if (r) {
			const s = this.froalaInstance?.selection.get();
			s?.removeAllRanges();
			s?.addRange(r);
			this.saveRange();
		}
	}

	protected saveRange() {
		if (this.froalaInstance?.selection.inEditor()) {
			this.lastRange = this.froalaInstance.selection.get().getRangeAt(0).cloneRange();
		}
	}

	protected updateModel() {
		if (this.froala) {
			const content = this.applyOutputTransformers(
				this.froala.core.isEmpty() ? '' : this.froala.html.get()
			);
			if (content != this.lastOut) {
				this.zone.run(() => {
					this.onChanged ? this.onChanged(content) : null;
					this.contentChanged$.next();
					this.cd.markForCheck();
					this.lastOut = content;
				});
			}
		}
	}

	protected setModel(value: string | null) {
		const val = this.applyInputTransformers(
			value && value.length > 0 ? value : '<p><br/></p>'
		);
		if (this.initialized == 1) {
      console.log(this.froala);
			const sendOut = this.froala?.html.get() === val;
			this.froala?.html.set(val);
			if (sendOut) this.updateModel();
		}
		this.currValue = val;
	}

	protected froalaInitialized() {
		this.initialized++;
		if (this.currValue) {
			//using timeout so that "this" has froala assigned
			setTimeout(() => {
				if (this.currValue) {
					this.froala?.html.set(this.currValue);
					this.updateModel();
				}
			}, 1);
		}
	}

	protected blur() {
		this.zone.run(() => {
			this.hasFocus = false;
			this.onTouched ? this.onTouched() : null;
			this.cd.markForCheck();
		});
	}

	protected focus() {
		this.zone.run(() => {
			this.hasFocus = true;
			this.cd.markForCheck();
		});
	}

	private applyInputTransformers(inString: string) {
		let ans = inString;
		for (const t of this.inputTransformers) {
			ans = t(ans);
		}
		return ans;
	}

	private applyOutputTransformers(inString: string) {
		let ans = inString;
		for (const t of this.outputTransformers) {
			ans = t(ans);
		}
		return ans;
	}
}
