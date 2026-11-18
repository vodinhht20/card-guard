import { useLocale } from "./Locale";
import {
  ModalOverlay,
  Modal as AriaModal,
  Dialog,
} from "react-aria-components";
import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const id = useId();
  return (
    <ModalOverlay
      className="modal-overlay"
      isOpen
      isDismissable={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AriaModal className="modal-surface">
        <Dialog aria-labelledby={id} className="modal-dialog">
          <div className="dialog-head">
            <h2 id={id}>{t(title)}</h2>
            <button
              type="button"
              className="icon-button"
              aria-label={t("Đóng")}
              onClick={onClose}
            >
              <X size={19} />
            </button>
          </div>
          {children}
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const { t } = useLocale();
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(
        children as ReactElement<{
          id?: string;
          "aria-describedby"?: string;
          "aria-labelledby"?: string;
        }>,
        {
          id,
          "aria-labelledby": `${id}-label`,
          "aria-describedby": hint ? `${id}-hint` : undefined,
        },
      )
    : children;
  return (
    <div className="field">
      <label id={`${id}-label`} htmlFor={id}>
        {t(label)}
      </label>
      {control}
      {hint && <small id={`${id}-hint`}>{t(hint)}</small>}
    </div>
  );
}
export function Empty({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="empty">
      <span className="empty-symbol">＋</span>
      <h3>{t(title)}</h3>
      {detail && <p>{t(detail)}</p>}
      {action}
    </div>
  );
}
