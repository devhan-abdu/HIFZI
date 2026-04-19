import { useState, useCallback } from "react";

type AlertType = "success" | "delete" | "warning" | "info";

interface AlertConfig {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  onConfirm: () => void;
}

export const useAlert = () => {
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    type: "info",
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showAlert = useCallback((config: Omit<AlertConfig, "visible">) => {
    setAlertConfig({ ...config, visible: true });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  const showSuccess = useCallback((title: string, message: string, onConfirm?: () => void) => {
    setAlertConfig({
      visible: true,
      type: "success",
      title,
      message,
      onConfirm: onConfirm || (() => hideAlert()),
    });
  }, [hideAlert]);

  const showError = useCallback((title: string, message: string) => {
    setAlertConfig({
      visible: true,
      type: "delete",
      title,
      message,
      onConfirm: () => hideAlert(),
    });
  }, [hideAlert]);

  return { alertConfig, showAlert, hideAlert, showSuccess, showError };
};