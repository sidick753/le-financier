import Swal, { SweetAlertOptions } from "sweetalert2";

const BASE: SweetAlertOptions = {
  confirmButtonColor: "#2563eb",
  buttonsStyling: true,
  customClass: {
    popup: "font-[Inter,system-ui,sans-serif]",
  },
};

export function alertSuccess(message: string, title = "Succès") {
  return Swal.fire({
    ...BASE,
    icon: "success",
    title,
    text: message,
    timer: 2500,
    timerProgressBar: true,
  });
}

export function alertError(message: string, title = "Erreur") {
  return Swal.fire({
    ...BASE,
    icon: "error",
    title,
    text: message,
  });
}

export function alertInfo(message: string, title = "Information") {
  return Swal.fire({
    ...BASE,
    icon: "info",
    title,
    text: message,
  });
}

export async function confirmDialog(
  message: string,
  options?: { title?: string; confirmText?: string; cancelText?: string; danger?: boolean },
): Promise<boolean> {
  const result = await Swal.fire({
    ...BASE,
    icon: "warning",
    title: options?.title ?? "Confirmer l'action",
    text: message,
    showCancelButton: true,
    confirmButtonText: options?.confirmText ?? "Confirmer",
    cancelButtonText: options?.cancelText ?? "Annuler",
    confirmButtonColor: (options?.danger ?? true) ? "#dc2626" : "#2563eb",
    cancelButtonColor: "#64748b",
    reverseButtons: true,
  });
  return result.isConfirmed;
}
