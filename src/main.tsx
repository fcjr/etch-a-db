import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WorldProvider } from 'koota/react';
import { App } from './app';
import { world } from './core/world';
import { ControlsModeProvider } from './utils/controls-mode';

const container = document.querySelector('#app');

if (!container) {
  throw new Error('App root element was not found.');
}

createRoot(container).render(
  <StrictMode>
    <WorldProvider world={world}>
      <ControlsModeProvider>
        <App />
      </ControlsModeProvider>
    </WorldProvider>
  </StrictMode>
);
