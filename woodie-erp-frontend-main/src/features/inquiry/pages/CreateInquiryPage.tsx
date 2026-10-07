import { Link, useNavigate } from "react-router-dom";
import AppShell from "../../../components/layout/AppShell";
import { themeClasses } from "../../../theme/classes";
import InquiryForm from "../components/InquiryForm";
import { createInquiry } from "../services/inquiryApi";
import type { CreateInquiryPayload } from "../services/inquiryTypes";

function CreateInquiryPage() {
  const navigate = useNavigate();

  async function handleCreate(payload: CreateInquiryPayload) {
    const created = await createInquiry(payload);
    setTimeout(() => navigate(`/inquiry/inquiries/${created._id}`), 800);
  }

  return (
    <AppShell activeNav="inquiries" pageTitle="New Inquiry" pageSubtitle="Capture client and visit details">
      <div className="space-y-6">
          <Link to="/inquiry/inquiries" className="text-sm font-medium text-ui-primary hover:underline">
            Back to listing
          </Link>
          <section className={themeClasses.cardPadding}>
            <h2 className={themeClasses.sectionTitle}>Capture inquiry</h2>
            <div className="mt-4">
              <InquiryForm mode="create" onSubmit={handleCreate} />
            </div>
          </section>
      </div>
    </AppShell>
  );
}

export default CreateInquiryPage;









