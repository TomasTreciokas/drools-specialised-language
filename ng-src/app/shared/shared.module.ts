import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveDimsDirective } from './directives/live-dims.directive';
import { AssertNotNullPipe } from './pipes/assert-not-null.pipe';
import { DefaultIfNullPipe } from './pipes/default-if-null.pipe';

@NgModule({
	declarations: [LiveDimsDirective, AssertNotNullPipe, DefaultIfNullPipe],
	imports: [CommonModule],
	exports: [LiveDimsDirective, AssertNotNullPipe, DefaultIfNullPipe],
})
export class SharedModule {}
