import { ConnectedPosition } from '@angular/cdk/overlay';
import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
	Input,
	Output,
} from '@angular/core';
import { User } from '@models/user';

import { TPlugins } from 'froala-editor';
import {
	BehaviorSubject,
	concat,
	distinctUntilChanged,
	filter,
	first,
	map,
	mapTo,
	merge,
	of,
	race,
	shareReplay,
	Subject,
	switchMap,
	switchMapTo,
	take,
	tap,
	throttle,
	timer,
	withLatestFrom,
} from 'rxjs';

const toolBarButtons = {
	moreText: {
		buttons: [
			'bold',
			'italic',
			'underline',
			'strikeThrough',
			'subscript',
			'superscript',
			'fontFamily',
			'fontSize',
			'textColor',
			'backgroundColor',
			'inlineClass',
			'inlineStyle',
			'clearFormatting',
		],
	},
	moreParagraph: {
		buttons: [
			'alignLeft',
			'alignCenter',
			'formatOLSimple',
			'alignRight',
			'alignJustify',
			'formatOL',
			'formatUL',
			'paragraphFormat',
			'paragraphStyle',
			'lineHeight',
			'outdent',
			'indent',
			'quote',
		],
	},
	moreRich: {
		buttons: ['insertLink', 'specialCharacters'],
	},
	moreMisc: {
		buttons: ['undo', 'redo', 'spellChecker', 'selectAll'],
		align: 'right',
		buttonsVisible: 2,
	},
};

@Component({
	selector: 'app-chat-input',
	templateUrl: './chat-input.component.html',
	styleUrls: ['./chat-input.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatInputComponent {
	@Input() users: User[];
	@Input() set content(c: string) {
    console.log(c);
    this.contentChanged.emit(c);
	}

	@Output() contentChanged = new EventEmitter<string>();
	@Output() get submit() {
		return this.submit$;
	}
	@Output() get startTyping() {
		return this.typing$.pipe(filter((val) => val));
	}
	@Output() get stopTyping() {
		return this.typing$.pipe(filter((val) => !val));
	}

	readonly mentionsOpen$ = new BehaviorSubject(false);

	readonly keyPress$ = new Subject<KeyboardEvent>();

	constructor(private cdRef: ChangeDetectorRef) {
		// cdRef.detach();
	}

	readonly submit$ = merge(
		this.keyPress$.pipe(
			withLatestFrom(this.mentionsOpen$),
			filter(
				([event, mentionsOpen]) =>
					event.key == 'Enter' && !event.shiftKey && mentionsOpen == false
			),
			tap(([event]) => event.preventDefault()),
			mapTo(void 0)
		)
		// this.sendBtn$
	).pipe(
		throttle(() =>
			timer(5).pipe(
				switchMapTo(this.contentChanged),
				filter((val) => val.length == 0),
				first()
			)
		)
	);

	private readonly typing$ = this.contentChanged.pipe(
		filter((html) => html.length > 0),
		switchMap(() =>
			concat(
				of(true),
				race(
					timer(2500), //send stopped notification whenever user has stopped typing for some time
					this.contentChanged.pipe(
						filter((html) => html.length == 0) //send stopped signal whenever input becomes empty
					)
				).pipe(take(1), mapTo(false))
			).pipe(map((isTyping) => ({ isTyping })))
		),
		distinctUntilChanged(
			//prevent repeated notfications from going through
			(x, y) => x.isTyping == y.isTyping
		),
		map(({ isTyping }) => isTyping),
		shareReplay({ bufferSize: 1, refCount: true })
	);

	readonly froalaPlugins: TPlugins[] = [
		'align',
		'colors',
		'entities',
		'fontFamily',
		'fontSize',
		'inlineStyle',
		'inlineClass',
		'lineBreaker',
		'lineHeight',
		'link',
		'lists',
		'paragraphFormat',
		'paragraphStyle',
		'quote',
		'table',
		'url',
		'wordPaste',
	];

	readonly overlayPos: ConnectedPosition[] = [
		{
			originX: 'center',
			overlayX: 'center',
			originY: 'top',
			overlayY: 'bottom',
		},
	];

	readonly buttons = toolBarButtons;
}
