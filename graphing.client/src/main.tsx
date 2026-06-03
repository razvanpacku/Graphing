import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthSessionProvider } from './features/auth'

createRoot(document.getElementById('root')!).render(
    <AuthSessionProvider>
        <App />
    </AuthSessionProvider>,
)
