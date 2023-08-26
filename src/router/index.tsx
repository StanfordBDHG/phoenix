import { Route, Routes } from 'react-router-dom';
import FrontPage from '../views/FrontPage';
import { TreeContextProvider } from '../store/treeStore/treeStore';

export default function AppRoutes(): JSX.Element {
    return (
        <Routes>
            <Route path="/phoenix" element={
                <TreeContextProvider>
                    <FrontPage />
                </TreeContextProvider>
            }/>
        </Routes>
    );
}
