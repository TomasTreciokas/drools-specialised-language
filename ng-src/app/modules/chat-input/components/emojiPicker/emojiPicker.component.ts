import {
	Component,
	ChangeDetectionStrategy,
	Output,
	EventEmitter,
	ChangeDetectorRef,
	Inject,
	Input,
} from '@angular/core';
import { Subject } from 'rxjs';

import { Emoji as EmojiData } from '@ctrl/ngx-emoji-mart/ngx-emoji';

import { EMOJI_SET } from '@modules/emoji/emoji-set';
import { EmojiPicker } from '@models';
import { EmojiService } from '@modules/emoji/emoji.service';
import { EmojiDirective } from '../../directives/emoji.directive';
import { FroalaDirective } from '@modules/froala/directives/froala.directive';

@Component({
	selector: 'emoji-picker',
	templateUrl: 'emojiPicker.component.html',
	styleUrls: ['./emojiPicker.component.less'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmojiPickerComponent implements EmojiPicker {
	@Output() open = new EventEmitter<void>();

	private _isOpened = false;
	readonly _emojiSelected$ = new Subject<string>();

	addEmoji(em: string) {
		this.froalaDir.restoreFocus();
		this.froalaEmojiDir.addEmoji(em);
	}

	get isOpened() {
		return this._isOpened;
	}

	set isOpened(val: boolean) {
		this._isOpened = val;
		if (val) this.open.emit();
	}

	close() {
		this.isOpened = false;
		this.cdRef.markForCheck();
	}

	@Input() froalaEmojiDir: EmojiDirective;
	@Input() froalaDir: FroalaDirective;

	constructor(
		private cdRef: ChangeDetectorRef,
		public emojiService: EmojiService,
		@Inject(EMOJI_SET) public emojiSet: EmojiData['set']
	) {}
}
