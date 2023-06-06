import { Route, Switch } from 'react-router-dom';
import FrontPage from '../views/FrontPage';
import { TreeContextProvider } from '../store/treeStore/treeStore';

export default function Routes(): JSX.Element {
    return (
        <Switch>
            <Route path="/phoenix" exact>
                <TreeContextProvider>
                    <FrontPage />
                </TreeContextProvider>
            </Route>
        </Switch>
    );
}
