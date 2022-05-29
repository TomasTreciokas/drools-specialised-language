import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	forwardRef,
	Input,
	NgZone,
	OnChanges,
	ViewChild,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { FroalaDirective, Options } from './directives/froala.directive';

@Component({
	selector: 'froala',
	templateUrl: './froala.component.html',
	styleUrls: ['./froala.component.less'],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => FroalaComponent),
			multi: true,
		},
		{
			provide: FroalaDirective,
			useExisting: forwardRef(() => FroalaComponent),
		},
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FroalaComponent extends FroalaDirective implements AfterViewInit, OnChanges {
	@Input() froalaOptions: Partial<Options> = {};
	@ViewChild('mainWorkspace') mainWorkspaceRef: ElementRef<HTMLDivElement>;

	constructor(zone: NgZone, cd: ChangeDetectorRef) {
		super(zone, cd);
	}

	ngAfterViewInit() {
		this.initEditor(this.mainWorkspaceRef, this.froalaOptions);
	}

	ngOnChanges(changes:any) {
		if (changes.froalaOptions && this.froalaOptions) {
			this.setOptions({ ...this.froalaOptions });
		}
	}
}
