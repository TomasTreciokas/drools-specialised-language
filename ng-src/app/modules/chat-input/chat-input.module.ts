import { createNgModuleRef, NgModule, StaticProvider } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatInputComponent } from './chat-input.component';
import { FroalaModule } from '../froala/froala.module';
import { downgradeModule } from '@angular/upgrade/static';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { getRootInjector } from 'ng-src/app/app.module';
import { SharedModule } from '@shared/shared.module';
import { FormsModule } from '@angular/forms';
import { EmojiDirective, FroalaEmojiItemDirective } from './directives/emoji.directive';
import { EmojiModule } from '@modules/emoji/emoji.module';
import { EmojiPickerComponent } from './components/emojiPicker/emojiPicker.component';

@NgModule({
	declarations: [
		ChatInputComponent,
		EmojiDirective,
		FroalaEmojiItemDirective,
		EmojiPickerComponent,
	],
	imports: [
		CommonModule,
		FormsModule,
		FroalaModule,
		OverlayModule,
		SharedModule,
		EmojiModule,
		MatIconModule,
		MatButtonModule,
	],
})
export class ChatInputModule {}

export const downgraded = downgradeModule(async (extraProviders: StaticProvider[]) => {
	const rootInjector = await getRootInjector(extraProviders);
	return createNgModuleRef(ChatInputModule, rootInjector);
});
