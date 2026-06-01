import './App.css'

import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from '../Pages/Home.tsx';

function App() {
    return (
        <BrowserRouter>
            <div className="app-shell">
                <header className="app-navbar" aria-label="Top navigation" />
                <main className="app-content">
                    <Routes>
                        <Route path="/" element={<Home />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App
