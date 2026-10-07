import AppShell from "../../components/layout/AppShell";
import type { NavKey } from "../../components/layout/IconSidebar";
import { themeClasses } from "../../theme/classes";

type ModulePlaceholderPageProps = {
  title: string;
  activeNav?: NavKey;
};

function ModulePlaceholderPage({ title, activeNav = "dashboard" }: ModulePlaceholderPageProps) {
  return (
    <AppShell activeNav={activeNav} pageTitle={title} pageSubtitle="Coming soon">
      <section className={`${themeClasses.cardPadding} text-center`}>
        <h2 className={themeClasses.sectionTitle}>{title}</h2>
        <p className="mt-2 text-sm text-text-secondary">{title} module will be added here.</p>
      </section>
    </AppShell>
  );
}

export default ModulePlaceholderPage;
