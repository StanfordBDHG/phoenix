import { BrowserRouter as Router } from 'react-router-dom';
import Routes from '../src/router/index';

import type { JSX } from 'react';

function App(): JSX.Element {
    return (
        <Router>
            <Routes />
        </Router>
    );
}

export default App;