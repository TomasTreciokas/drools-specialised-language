import { InjectionToken } from '@angular/core';

import { Emoji } from '@ctrl/ngx-emoji-mart/ngx-emoji';

export const EMOJI_SET = new InjectionToken<Emoji['set']>('EMOJI_SET');
