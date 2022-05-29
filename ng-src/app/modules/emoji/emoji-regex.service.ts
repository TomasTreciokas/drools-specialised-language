import { Injectable } from '@angular/core';

import { Emoji } from '@models';

/** Service to provide emoji regex */
@Injectable({
    providedIn: 'root',
})
export class EmojiRegexService {
    constructor() {}

    get regex() {
        return Emoji.regex;
    }
}
