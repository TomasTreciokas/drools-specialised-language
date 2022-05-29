import {
	ChangeDetectorRef,
	forwardRef,
	Input,
	NgZone,
	OnChanges,
	Output,
} from '@angular/core';
import { Directive, ElementRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { FroalaDirective, Options } from './froala.directive';

@Directive({
	selector: '[froalaInline]',
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => FroalaInlineDirective),
			multi: true,
		},
		{
			provide: FroalaDirective,
			useExisting: forwardRef(() => FroalaInlineDirective),
		},
	],
	exportAs: 'froala',
})
export class FroalaInlineDirective extends FroalaDirective implements OnChanges {
	@Input() froalaOptions: Partial<Options> | null | undefined;

	@Output() get froalaKeydown() {
		return this.keyDown$;
	}

	constructor(el: ElementRef, zone: NgZone, cd: ChangeDetectorRef) {
		super(zone, cd);
		this.initEditor(el, {
			toolbarInline: true,
		});
	}

	ngOnChanges(changes: any) {
		if (changes.froalaOptions && this.froalaOptions) {
			this.setOptions({ toolbarInline: true, ...this.froalaOptions });
		}
	}
}
