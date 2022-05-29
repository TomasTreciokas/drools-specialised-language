import { Directive, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { distinctUntilChanged, map, startWith } from 'rxjs/operators';

@Directive({
	selector: '[liveDims]',
	exportAs: 'liveDims'
})
export class LiveDimsDirective implements OnInit, OnDestroy {
	private readonly _res$ = new Subject<ResizeObserverEntry[]>();

	private readonly obs = new ResizeObserver((entries) => this._res$.next(entries));

	readonly width$ = this._res$.pipe(
		startWith(null),
		map(() => this.el.nativeElement.offsetWidth),
		distinctUntilChanged()
	);

	constructor(private el: ElementRef<HTMLElement>) {}

	ngOnDestroy() {
		this.obs.disconnect();
	}

	ngOnInit() {
		this.obs.observe(this.el.nativeElement);
	}
}
