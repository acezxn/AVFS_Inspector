import { SessionProvider, useSession } from './session/SessionContext';
import { ToastProvider } from './ui/toast';
import { DialogProvider } from './ui/dialogs';
import { LockScreen } from './auth/LockScreen';
import { Desktop } from './shell/Desktop';
import { registerExpireHandler } from './api/expire';

function Root(): JSX.Element {
  const { session, expire } = useSession();
  registerExpireHandler(expire);
  return session ? <Desktop /> : <LockScreen />;
}

export function App(): JSX.Element {
  return (
    <SessionProvider>
      <ToastProvider>
        <DialogProvider>
          <Root />
        </DialogProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
