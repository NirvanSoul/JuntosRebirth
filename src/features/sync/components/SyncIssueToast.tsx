import {
  NoticeToast,
  type ToastNotice,
} from '@/components/overlays/NoticeToast/NoticeToast';
import type { SyncIssue } from '@/features/sync/hooks/useSessionStartup';

type SyncIssueToastProps = {
  issue: SyncIssue | null;
  onDismiss: (issueId: number) => void;
  onRetry: () => void;
};

const retryLabel = 'Reintentar';

function toNotice(issue: SyncIssue, onRetry: () => void): ToastNotice {
  return issue.kind === 'offline'
    ? {
        id: issue.id,
        message: 'Sin conexión. Mostramos lo guardado en este dispositivo.',
        tone: 'info',
        action: { label: retryLabel, onPress: onRetry },
      }
    : {
        id: issue.id,
        message:
          'No pudimos sincronizar tus datos. Lo guardado en este dispositivo sigue intacto.',
        tone: 'warning',
        action: { label: retryLabel, onPress: onRetry },
      };
}

/** Aviso no bloqueante del fallo de sincronización al abrir la cuenta. */
export function SyncIssueToast({
  issue,
  onDismiss,
  onRetry,
}: SyncIssueToastProps) {
  return (
    <NoticeToast
      notice={issue ? toNotice(issue, onRetry) : null}
      onDismiss={onDismiss}
      testID="sync-issue-toast"
    />
  );
}
