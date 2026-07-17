export type IndicatorStatus = "conforme" | "attention" | "violation" | "non_disponible";

export function computeIndicatorStatus(value: number, seuil: number, plusBas: boolean): IndicatorStatus {
  if (plusBas) {
    if (value <= seuil) return "conforme";
    if (value <= seuil * 1.2) return "attention";
    return "violation";
  }
  if (value >= seuil) return "conforme";
  if (value >= seuil * 0.85) return "attention";
  return "violation";
}
