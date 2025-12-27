import { useAlerts } from "../../context/AlertsContext";
import AlertToast from "./AlertToast";

export default function AlertToastContainer() {
  const { toastQueue, removeToast } = useAlerts();

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none">
      <div className="pointer-events-auto space-y-3">
        {toastQueue.map((toast) => (
          <AlertToast
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
}
