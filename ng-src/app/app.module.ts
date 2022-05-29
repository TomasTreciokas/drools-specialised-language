import {
	createNgModuleRef,
	DoBootstrap,
	Injector,
	NgModuleRef,
	StaticProvider,
	VERSION,
} from '@angular/core';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

// import { AppComponent } from './app.component';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { downgradeModule } from '@angular/upgrade/static';
import { EmojiModule } from './modules/emoji/emoji.module';

@NgModule({
	declarations: [],
	imports: [BrowserModule, BrowserAnimationsModule, EmojiModule.forRoot()],
	providers: [],
})
export class AppModule implements DoBootstrap {
	constructor() {
		console.debug('Angular ' + VERSION.major + ' is running');
	}

	ngDoBootstrap() {}
}

let moduleRefPromise: Promise<NgModuleRef<AppModule>> | null = null;

const getModuleRef = (extraProviders: StaticProvider[]) => {
	if (!moduleRefPromise) {
		moduleRefPromise = platformBrowserDynamic(extraProviders).bootstrapModule(AppModule);
	}
	return moduleRefPromise;
};

export const getRootInjector = async (extraProviders: StaticProvider[]) => {
	const moduleRef = await getModuleRef(extraProviders);
	return moduleRef.injector;
};

export const downgraded = downgradeModule(getModuleRef);
