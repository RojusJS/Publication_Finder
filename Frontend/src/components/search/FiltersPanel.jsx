import { useState } from "react";
import { autocompleteInstitutions } from "../../api/search";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import useQuery from "../../hooks/useQuery";
import { useT } from "../../i18n/LanguageContext";
import { CURRENT_YEAR, FILTER_LANGUAGES, WORK_TYPES } from "../../utils/publication";
import { Spinner } from "../ui/Feedback";
import Icon from "../ui/Icon";

function InstitutionPicker({ value, name, onChange }) {
  const t = useT();
  const [text, setText] = useState("");
  const debounced = useDebouncedValue(text.trim(), 300);
  const suggestions = useQuery(debounced.length >= 2 ? `institutions:${debounced}` : null, () => autocompleteInstitutions(debounced));

  if (value) {
    return (
      <div className="chip chip-info" style={{ justifyContent: "space-between", width: "100%", whiteSpace: "normal" }}>
        <span>{name || value}</span>
        <button type="button" className="btn btn-ghost btn-icon btn-xs" aria-label={t("filters.remove_institution")} onClick={() => onChange(null)}>
          <Icon name="x" size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="stack-sm">
      <div style={{ position: "relative" }}>
        <input
          id="filter-institution"
          className="input input-sm"
          value={text}
          placeholder={t("filters.institution_placeholder")}
          autoComplete="off"
          onChange={(event) => setText(event.target.value)}
        />
        {suggestions.loading && (
          <span style={{ position: "absolute", right: 8, top: 6 }}>
            <Spinner />
          </span>
        )}
      </div>
      {debounced.length >= 2 && suggestions.data && (
        <div className="card" style={{ padding: 4 }}>
          {suggestions.data.length === 0 && <div className="menu-empty">{t("filters.no_institutions")}</div>}
          {suggestions.data.map((item) => (
            <button
              key={item.id}
              type="button"
              className="menu-item"
              style={{ flexDirection: "column", alignItems: "flex-start", gap: 0 }}
              onClick={() => {
                setText("");
                onChange(item);
              }}
            >
              <span className="small strong">{item.display_name}</span>
              {item.hint && <span className="tiny muted">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function YearInput({ id, value, onCommit, placeholder }) {
  const [draft, setDraft] = useState(value);
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === value) return;
    const year = Number.parseInt(trimmed, 10);
    if (trimmed === "" || (year >= 1000 && year <= CURRENT_YEAR)) onCommit(trimmed === "" ? "" : String(year));
    else setDraft(value);
  };
  return (
    <input
      id={id}
      className="input input-sm"
      type="number"
      inputMode="numeric"
      min={1000}
      max={CURRENT_YEAR}
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => event.key === "Enter" && commit()}
    />
  );
}

/** Search filters. Every change is applied (and the search re-run) immediately. */
export default function FiltersPanel({ state, onChange, onReset, collapsed }) {
  const t = useT();
  const recentFrom = String(CURRENT_YEAR - 4);
  const disabled = state.by === "author";

  return (
    <aside className={`card filters-panel ${collapsed ? "is-collapsed" : ""}`} aria-label={t("filters.title")}>
      <div className="stack">
        <div className="row-between">
          <h2 className="section-title">{t("filters.title")}</h2>
          <button type="button" className="link-button tiny" onClick={onReset}>
            {t("filters.reset")}
          </button>
        </div>
        {disabled && <p className="tiny muted">{t("filters.author_mode_note")}</p>}
        <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0 }} className="stack">
          <div className="field">
            <span className="field-label">{t("filters.years")}</span>
            <div className="row">
              <label className="visually-hidden" htmlFor="filter-from">{t("filters.year_from")}</label>
              <YearInput key={`from-${state.from}`} id="filter-from" value={state.from} placeholder={t("filters.year_from")} onCommit={(value) => onChange({ from: value })} />
              <span className="muted">–</span>
              <label className="visually-hidden" htmlFor="filter-to">{t("filters.year_to")}</label>
              <YearInput key={`to-${state.to}`} id="filter-to" value={state.to} placeholder={t("filters.year_to")} onCommit={(value) => onChange({ to: value })} />
            </div>
            <label className="checkbox small">
              <input
                type="checkbox"
                checked={state.from === recentFrom && !state.to}
                onChange={(event) => onChange(event.target.checked ? { from: recentFrom, to: "" } : { from: "" })}
              />
              {t("filters.last_five_years")}
            </label>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="filter-type">{t("filters.type")}</label>
            <select id="filter-type" className="select select-sm" value={state.type} onChange={(event) => onChange({ type: event.target.value })}>
              <option value="">{t("filters.any")}</option>
              {WORK_TYPES.map((type) => (
                <option key={type} value={type}>{t(`types.${type}`)}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="filter-language">{t("filters.language")}</label>
            <select id="filter-language" className="select select-sm" value={state.lang} onChange={(event) => onChange({ lang: event.target.value })}>
              <option value="">{t("filters.any")}</option>
              {FILTER_LANGUAGES.map((code) => (
                <option key={code} value={code}>{t(`languages.${code}`)}</option>
              ))}
            </select>
          </div>

          <label className="checkbox">
            <input type="checkbox" checked={state.oa} onChange={(event) => onChange({ oa: event.target.checked })} />
            {t("filters.open_access")}
          </label>

          <div className="field">
            <label className="field-label" htmlFor="filter-institution">{t("filters.institution")}</label>
            <InstitutionPicker
              value={state.inst}
              name={state.instName}
              onChange={(item) => onChange(item ? { inst: item.id, instName: item.display_name } : { inst: "", instName: "" })}
            />
            <span className="field-hint">{t("filters.institution_hint")}</span>
          </div>
        </fieldset>
      </div>
    </aside>
  );
}
