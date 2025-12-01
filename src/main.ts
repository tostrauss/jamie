// src/main.ts
// Jamie App - Application Entry Point

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Bootstrap the application
bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    console.log('🚀 Jamie App started successfully!');
    
    // Remove loading screen if exists
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 300);
    }
  })
  .catch((err) => {
    console.error('❌ Bootstrap Error:', err);
    
    // Show error message to user
    const root = document.querySelector('app-root');
    if (root) {
      root.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2rem;
          text-align: center;
          background: #1c1c2e;
          color: white;
        ">
          <h1 style="color: #FD7666; font-size: 2rem; margin-bottom: 1rem;">Jamie</h1>
          <p style="color: #9ca3af; margin-bottom: 1.5rem;">
            Etwas ist schiefgelaufen. Bitte lade die Seite neu.
          </p>
          <button 
            onclick="location.reload()" 
            style="
              background: #FD7666;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 12px;
              font-weight: 600;
              cursor: pointer;
            "
          >
            Neu laden
          </button>
        </div>
      `;
    }
  });