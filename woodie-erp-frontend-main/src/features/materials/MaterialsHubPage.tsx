import { ClipboardList, Package } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import { useAuth } from "../auth/AuthContext";
import { canViewMaterialInventory } from "../auth/permissions";
import { MaterialInventorySection } from "./MaterialListPage";
import { MaterialRequestsSection } from "./MaterialRequestListPage";

export type MaterialsTab = "requests" | "inventory";

function MaterialsTabBar({
  active,
  showInventory,
  onSelect,
}: {
  active: MaterialsTab;
  showInventory: boolean;
  onSelect: (tab: MaterialsTab) => void;
}) {
  const tabClass = (tab: MaterialsTab) =>
    [
      "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition",
      active === tab
        ? "bg-surface-card text-text-primary shadow-sm"
        : "text-text-muted hover:text-text-primary",
    ].join(" ");

  return (
    <div
      className="mb-5 inline-flex rounded-lg border border-surface-border-light bg-surface-muted p-1"
      role="tablist"
      aria-label="Materials sections"
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === "requests"}
        className={tabClass("requests")}
        onClick={() => onSelect("requests")}
      >
        <ClipboardList className="h-4 w-4" />
        Material Requests
      </button>
      {showInventory ? (
        <button
          type="button"
          role="tab"
          aria-selected={active === "inventory"}
          className={tabClass("inventory")}
          onClick={() => onSelect("inventory")}
        >
          <Package className="h-4 w-4" />
          Inventory
        </button>
      ) : null}
    </div>
  );
}

function MaterialsHubPage() {
  const { user } = useAuth();
  const role = user?.role ?? "admin";
  const showInventory = canViewMaterialInventory(role);
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: MaterialsTab =
    tabParam === "inventory" && showInventory ? "inventory" : "requests";

  function selectTab(tab: MaterialsTab) {
    if (tab === "requests") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: "inventory" }, { replace: true });
    }
  }

  return (
    <AppShell
      activeNav="materials"
      pageTitle="Materials"
      pageSubtitle="Material requests and inventory stock levels"
    >
      <MaterialsTabBar active={activeTab} showInventory={showInventory} onSelect={selectTab} />
      {activeTab === "requests" ? <MaterialRequestsSection /> : <MaterialInventorySection />}
    </AppShell>
  );
}

export default MaterialsHubPage;
