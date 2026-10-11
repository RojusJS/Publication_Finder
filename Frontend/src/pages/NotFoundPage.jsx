import { Link } from "react-router-dom";
import { EmptyState } from "../components/ui/Feedback";
import { useT } from "../i18n/LanguageContext";

export default function NotFoundPage() {
  const t = useT();
  return (
    <div className="page">
      <EmptyState icon="alert" title={t("not_found.title")} action={<Link className="btn btn-primary" to="/">{t("common.back_to_search")}</Link>}>
        {t("not_found.description")}
      </EmptyState>
    </div>
  );
}
