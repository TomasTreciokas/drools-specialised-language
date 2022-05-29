import { Pipe, PipeTransform } from '@angular/core';

import { EmojiService } from './emoji.service';

/** Converts string containing emojis to tokens */
@Pipe({
    name: 'tokenizEmoji',
})
export class tokenizeEmoji implements PipeTransform {
    constructor(private emojiService: EmojiService) {}

    transform(string: string) {
        return this.emojiService.TokenizeUnicodeEmoji(string);
    }
}
