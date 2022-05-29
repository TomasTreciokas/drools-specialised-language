import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FroalaInlineDirective } from './directives/froala-inline.directive';
import { FroalaTrimWhitespaceDirective } from './directives/froala-trim-whitespace.directive';
import { FroalaComponent } from './froala.component';
import { MentionItemDirective, MentionsDirective } from './directives/mentions.directive';

@NgModule({
	declarations: [
		FroalaInlineDirective,
		FroalaTrimWhitespaceDirective,
		MentionsDirective,
		MentionItemDirective,
		FroalaComponent,
	],
	imports: [CommonModule],
	exports: [
		FroalaInlineDirective,
		FroalaTrimWhitespaceDirective,
		FroalaComponent,
		MentionsDirective,
		MentionItemDirective,
	],
})
export class FroalaModule {}
