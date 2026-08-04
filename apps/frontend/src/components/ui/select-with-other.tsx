"use client";

const OTHER_SENTINEL = "__other__";

export interface SelectWithOtherOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectWithOtherOption[];
  placeholder?: string;
  otherLabel?: string;
  otherPlaceholder?: string;
  className?: string;
  inputClassName?: string;
}

// Select à liste fermée + option "Autre" révélant un champ libre — le champ
// enregistré reste une simple chaîne dans tous les cas (valeur de la liste ou
// texte libre), donc aucun changement backend requis. Une valeur déjà en base
// qui ne correspond à aucune option de la liste bascule automatiquement en
// mode "Autre" avec le texte d'origine préservé (rétrocompatible sans migration).
export function SelectWithOther({
  value,
  onChange,
  options,
  placeholder = "Sélectionner",
  otherLabel = "Autre",
  otherPlaceholder = "Précisez",
  className,
  inputClassName,
}: Props) {
  const isCustom = value !== "" && !options.some((o) => o.value === value);
  const selectValue = value === "" ? "" : isCustom ? OTHER_SENTINEL : value;

  return (
    <>
      <select
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === OTHER_SENTINEL ? (isCustom ? value : "") : v);
        }}
        className={className}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        <option value={OTHER_SENTINEL}>{otherLabel}</option>
      </select>
      {selectValue === OTHER_SENTINEL && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={otherPlaceholder}
          className={inputClassName ?? "mt-2 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-brand-700 focus:outline-none"}
        />
      )}
    </>
  );
}
