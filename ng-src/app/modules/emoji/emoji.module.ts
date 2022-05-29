import { ModuleWithProviders, NgModule } from '@angular/core';

import { PickerModule } from '@ctrl/ngx-emoji-mart';

import { tokenizeEmoji } from './emoji.pipe';
import { EMOJI_SET } from './emoji-set';
import { EmojiDirective } from './directives/emoji.directive';

@NgModule({
	imports: [PickerModule],
	declarations: [tokenizeEmoji, EmojiDirective],
	exports: [tokenizeEmoji, PickerModule, EmojiDirective],
})
export class EmojiModule {
	static forRoot(): ModuleWithProviders<EmojiModule> {
		return {
			ngModule: EmojiModule,
			providers: [
				{
					provide: EMOJI_SET,
					useValue: 'twitter',
				},
			],
		};
	}
}
