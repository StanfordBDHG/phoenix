import './index.css';

import * as serviceWorker from './serviceWorker';

import App from './App';
import { createRoot } from 'react-dom/client';
import { UserProvider } from './contexts/UserContext';
import './helpers/i18n';
//import { debugContextDevtool } from 'react-context-devtool';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

root.render(
    <UserProvider>
        <App />
    </UserProvider>
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
