import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Az önce oluşturduğumuz sağlayıcıyı import ediyoruz
import { Web3Provider } from './context/Web3Context'; 

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    {/* App bileşenini Web3Provider ile sarmalıyoruz */}
    <Web3Provider>
      <App />
    </Web3Provider>
  </React.StrictMode>
);