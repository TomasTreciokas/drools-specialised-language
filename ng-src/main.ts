import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';

// import './ajs.imports';

if (environment.production) {
	enableProdMode();
}

// platformBrowserDynamic().bootstrapModule(AppModule)
//   .catch(err => console.error(err));
