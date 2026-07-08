import { render } from 'preact';
import App from './App.tsx';
import './index.css';

// Global error boundary for physical device debugging on legacy Gecko engines
try {
  window.onerror = function (msg, url, line, col, error) {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '100vw';
    div.style.height = '100vh';
    div.style.backgroundColor = '#7f1d1d';
    div.style.color = '#fef2f2';
    div.style.padding = '8px';
    div.style.zIndex = '999999';
    div.style.overflow = 'auto';
    div.style.fontFamily = 'monospace';
    div.style.fontSize = '9px';
    div.style.boxSizing = 'border-box';
    div.style.lineHeight = '1.3';
    
    div.innerHTML = '<h3 style="color:#fecaca;margin:0 0 6px 0;font-size:11px;">[SYSTEM CRASH]</h3>' +
      '<div style="margin-bottom:6px;"><b>Error:</b> ' + msg + '</div>' +
      '<div style="margin-bottom:6px;"><b>File:</b> ' + (url || 'unknown').split('/').pop() + '</div>' +
      '<div style="margin-bottom:6px;"><b>Line:</b> ' + line + ' <b>Col:</b> ' + col + '</div>' +
      '<div style="margin-bottom:6px;word-break:break-all;"><b>UA:</b> ' + navigator.userAgent + '</div>' +
      '<div><b>Stack:</b><pre style="margin:4px 0 0 0;white-space:pre-wrap;color:#fca5a5;font-size:8px;">' + (error && error.stack ? error.stack : 'No stack trace available') + '</pre></div>';
      
    if (document.body) {
      document.body.appendChild(div);
    } else {
      window.addEventListener('DOMContentLoaded', function() {
        document.body.appendChild(div);
      });
    }
    return false;
  };
} catch (e) {
  // Ignored
}

const init = () => {
  const root = document.getElementById('root');
  if (root) {
    render(<App />, root);
  } else {
    console.error('Root element #root not found, retrying...');
    setTimeout(init, 50);
  }
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
