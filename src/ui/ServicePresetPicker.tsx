import { ServiceLogo } from "./ServiceLogo";
import { searchServicePresets } from "../core/serviceCatalog";
import { Field } from "./components";
export function ServicePresetPicker({
  query,
  onQuery,
  onSelect,
  onCustom,
  t,
}: {
  query: string;
  onQuery: (v: string) => void;
  onSelect: (id: string) => void;
  onCustom: () => void;
  t: (v: string) => string;
}) {
  const presets = searchServicePresets(query);
  return (
    <section className="preset-picker" aria-label={t("Chọn dịch vụ")}>
      <h3>{t("Chọn dịch vụ phổ biến")}</h3>
      <Field label={t("Tìm dịch vụ")}>
        <input
          type="search"
          maxLength={100}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={t("Tên, website hoặc nhóm dịch vụ…")}
          autoFocus
        />
      </Field>
      {presets.length ? (
        <div className="preset-grid">
          {presets.map((p) => (
            <button
              type="button"
              key={p.id}
              className="preset-option"
              onClick={() => onSelect(p.id)}
            >
              <ServiceLogo domain={p.domain} name={p.name} />
              <span>
                <strong>{p.name}</strong>
                <small>{p.domain}</small>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="preset-empty" role="status">
          {t("Không tìm thấy dịch vụ. Bạn có thể tạo dịch vụ riêng.")}
        </p>
      )}
      <button
        type="button"
        className="secondary full custom-service"
        onClick={onCustom}
      >
        ＋ {t("Dịch vụ khác")}
      </button>
    </section>
  );
}
