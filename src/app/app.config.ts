import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // Import anpassen!

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor'; // Import

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Hier registrieren wir den Interceptor:
    provideHttpClient(withInterceptors([authInterceptor])) 
  ]
};