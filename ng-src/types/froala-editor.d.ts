declare module 'froala-editor' {
	export default class FroalaEditor {
		constructor(el: string | HTMLElement, options: Partial<CtorOptions>);

		el: HTMLElement;

		core: {
			isEmpty(): boolean;
		};

		placeholder: {
			show(): void;
			refresh(): void;
		};

		html: {
			get(): string;
			set(html: string): void;
			insert(html: string): void;
		};

		events: {
			focus(): void;
			trigger(name: keyof Events, args?: any[], force?: boolean): void;
		};

		selection: {
			get(): Selection;
			inEditor(): boolean;
			setAfter(node: Node): void;
		};

		commands: {
			undo(): void;
		};

		cursor: {
			enter(shift?: boolean): void;
		};

		destroy(keep_markers?: boolean): void;
	}

	export type TPlugins =
		| 'align'
		| 'charCounter'
		| 'codeBeautifier'
		| 'codeView'
		| 'colors'
		| 'draggable'
		| 'embedly'
		| 'emoticons'
		| 'entities'
		| 'file'
		| 'fontAwesome'
		| 'fontFamily'
		| 'fontSize'
		| 'fullscreen'
		| 'image'
		| 'imageTUI'
		| 'imageManager'
		| 'inlineStyle'
		| 'inlineClass'
		| 'lineBreaker'
		| 'lineHeight'
		| 'link'
		| 'lists'
		| 'paragraphFormat'
		| 'paragraphStyle'
		| 'quickInsert'
		| 'quote'
		| 'save'
		| 'table'
		| 'url'
		| 'video'
		| 'wordPaste';

	export interface PasteEvent {
		data: string;
		modify?: boolean;
	}
	export interface Events {
		contentChanged: void;
		blur: void;
		initialized: void;
		focus: void;
		keydown: { originalEvent: KeyboardEvent };
		keyup: { originalEvent: KeyboardEvent };
		mouseup: MouseEvent;
		keypress: { originalEvent: KeyboardEvent };
		input: { originalEvent: InputEvent };
		'paste.afterCleanup': string;
		'paste.beforeCleanup': string;
	}

	export interface CtorOptions {
		toolbarInline: boolean;
		quickInsertEnabled?: boolean;
		placeholderText?: string;
		multiLine?: boolean;
		events: Partial<{
			[e in keyof Events]: (arg: Events[e]) => any;
		}>;
		toolbarButtons?: any;
		toolbarButtonsMD?: any;
		toolbarButtonsSM?: any;
		toolbarButtonsXS?: any;
		zIndex?: number;
		height: number;
		heightMin: number;
		heightMax: number;
		pluginsEnabled?: TPlugins[];
		charCounterCount: boolean;
		charCounterMax: number;
	}
}
