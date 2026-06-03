import { useEffect, useState } from 'react';
import { useAuthSession } from '../src/features/auth';

export default function AdminPanel() {
    const { currentUser, isRestoring } = useAuthSession();
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!currentUser) return;
        setMessage(`Welcome, ${currentUser.name}. This is the admin panel.`);
    }, [currentUser]);

    if (isRestoring) return <div>Restoring session...</div>;
    if (!currentUser?.isAdmin) return <div>Access denied.</div>;

    return (
        <div>
            <h2>Admin Panel</h2>
            <div>{message}</div>
        </div>
    );
}
