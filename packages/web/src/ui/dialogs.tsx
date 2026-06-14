import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface ConfirmReq {
  kind: 'confirm';
  title: string;
  message: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}
interface PromptReq {
  kind: 'prompt';
  title: string;
  message: string;
  initial: string;
  resolve: (value: string | null) => void;
}
type Req = ConfirmReq | PromptReq;

interface DialogApi {
  confirm: (opts: { title: string; message: string; danger?: boolean }) => Promise<boolean>;
  prompt: (opts: { title: string; message: string; initial?: string }) => Promise<string | null>;
}

const Ctx = createContext<DialogApi | null>(null);

export function DialogProvider({ children }: { children: ReactNode }): JSX.Element {
  const [req, setReq] = useState<Req | null>(null);
  const [field, setField] = useState('');

  const confirm: DialogApi['confirm'] = useCallback(
    (opts) => new Promise((resolve) => setReq({ kind: 'confirm', resolve, ...opts })),
    [],
  );
  const prompt: DialogApi['prompt'] = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setField(opts.initial ?? '');
        setReq({ kind: 'prompt', resolve, initial: opts.initial ?? '', ...opts });
      }),
    [],
  );

  const close = (): void => setReq(null);

  const cancel = (r: Req): void => {
    if (r.kind === 'prompt') r.resolve(null);
    else r.resolve(false);
    close();
  };
  const accept = (r: Req): void => {
    if (r.kind === 'prompt') r.resolve(field);
    else r.resolve(true);
    close();
  };

  return (
    <Ctx.Provider value={{ confirm, prompt }}>
      {children}
      {req && (
        <div className="modal-backdrop" onPointerDown={() => cancel(req)}>
          <div className="modal" onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-label={req.title}>
            <h3 className="modal__title">{req.title}</h3>
            <p className="modal__message">{req.message}</p>
            {req.kind === 'prompt' && (
              <input
                className="modal__input"
                autoFocus
                value={field}
                onChange={(e) => setField(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') accept(req); }}
              />
            )}
            <div className="modal__actions">
              <button onClick={() => cancel(req)}>Cancel</button>
              <button
                className={req.kind === 'confirm' && req.danger ? 'btn-danger' : 'btn-primary'}
                onClick={() => accept(req)}
              >
                {req.kind === 'confirm' && req.danger ? 'Delete' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useDialogs(): DialogApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDialogs must be used within DialogProvider');
  return v;
}
