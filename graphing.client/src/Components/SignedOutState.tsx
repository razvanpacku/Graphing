export default function SignedOutState({
    title = 'You are signed out',
    description = 'Sign in again to keep accessing your saved scenes and post interactions.'
}: {
    title?: string;
    description?: string;
}) {
    return (
        <div className="scene-empty-state">
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    );
}
