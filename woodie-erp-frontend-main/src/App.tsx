import { Navigate, Route, Routes } from "react-router-dom";
import { FIELD_ROLES, ROLES } from "./config/rbac";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./features/auth/pages/LoginPage";
import BoqPage from "./features/boq/BoqPage";
import QuotationDetailPage from "./features/boq/QuotationDetailPage";
import BoqCostingPage from "./features/boq/BoqCostingPage";
import WorkOrderDetailPage from "./features/workorders/WorkOrderDetailPage";
import WorkOrdersPage from "./features/workorders/WorkOrdersPage";
import RoleDashboardPage from "./features/dashboard/RoleDashboardPage";
import CreateInquiryPage from "./features/inquiry/pages/CreateInquiryPage";
import EditInquiryPage from "./features/inquiry/pages/EditInquiryPage";
import MyVisitsPage from "./features/inquiry/pages/EngineerVisitsPage";
import InquiryDetailsPage from "./features/inquiry/pages/InquiryDetailsPage";
import InquiryListingPage from "./features/inquiry/pages/InquiryListingPage";
import CreateTeamPage from "./features/team/pages/CreateTeamPage";
import EditTeamPage from "./features/team/pages/EditTeamPage";
import TeamListingPage from "./features/team/pages/TeamListingPage";
import MaterialsHubPage from "./features/materials/MaterialsHubPage";
import MaterialRequestPage from "./features/materials/MaterialRequestPage";
import InvoiceListPage from "./features/invoices/InvoiceListPage";
import InvoiceDetailPage from "./features/invoices/InvoiceDetailPage";
import CreateInvoicePage from "./features/invoices/CreateInvoicePage";
const SALES_OR_ADMIN = [ROLES.ADMIN, ROLES.SALES];
const FINANCE_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.ACCOUNTS];
const BOQ_ROLES = [ROLES.ADMIN, ROLES.SALES, ROLES.MANAGER, ROLES.PROCUREMENT];
const WORK_ORDER_ROLES = [ROLES.ADMIN, ROLES.SALES, ROLES.MANAGER, ROLES.PROCUREMENT, ...FIELD_ROLES];
const MATERIALS_HUB_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.PROCUREMENT, ...FIELD_ROLES];
const MATERIAL_REQUEST_CREATE_ROLES = [...FIELD_ROLES];

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RoleDashboardPage />} />

        <Route element={<ProtectedRoute allowedRoles={SALES_OR_ADMIN} />}>
          <Route path="/inquiry/inquiries" element={<InquiryListingPage />} />
          <Route path="/inquiry/inquiries/new" element={<CreateInquiryPage />} />
          <Route path="/inquiry/inquiries/:id/edit" element={<EditInquiryPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={FIELD_ROLES} />}>
          <Route path="/inquiry/my-visits" element={<MyVisitsPage />} />
        </Route>

        <Route path="/inquiry/inquiries/:id" element={<InquiryDetailsPage />} />

        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route path="/team" element={<TeamListingPage />} />
          <Route path="/team/new" element={<CreateTeamPage />} />
          <Route path="/team/:id/edit" element={<EditTeamPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={BOQ_ROLES} />}>
          <Route path="/boq" element={<BoqPage />} />
          <Route path="/quotations" element={<Navigate to="/boq" replace />} />
          <Route path="/boq/:id" element={<QuotationDetailPage />} />
          <Route path="/boq/:id/costing" element={<BoqCostingPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={WORK_ORDER_ROLES} />}>
          <Route path="/workorders" element={<WorkOrdersPage />} />
          <Route path="/workorders/:id" element={<WorkOrderDetailPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={MATERIALS_HUB_ROLES} />}>
          <Route path="/materials" element={<MaterialsHubPage />} />
          <Route path="/materials/requests" element={<Navigate to="/materials" replace />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={MATERIAL_REQUEST_CREATE_ROLES} />}>
          <Route path="/materials/requests/new" element={<MaterialRequestPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={FINANCE_ROLES} />}>
          <Route path="/finance/invoices" element={<InvoiceListPage />} />
          <Route path="/finance/invoices/new" element={<CreateInvoicePage />} />
          <Route path="/finance/invoices/:id" element={<InvoiceDetailPage />} />
        </Route>

      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

