import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { InlineFeedbackAlert } from "../../../components/AppFeedback";
import AppShell from "../../../components/layout/AppShell";
import { themeClasses } from "../../../theme/classes";
import InquiryForm from "../components/InquiryForm";
import { getInquiryById, updateInquiry } from "../services/inquiryApi";
import type { CreateInquiryPayload, Inquiry } from "../services/inquiryTypes";

function inquiryToPayload(inquiry: Inquiry): CreateInquiryPayload {
  return {
    clientName: inquiry.clientName,
    contactPersonName: inquiry.contactPersonName ?? "",
    phone: inquiry.phone.replace(/\D/g, "").slice(0, 10),
    category: inquiry.category,
    scopeOfWork: inquiry.scopeOfWork,
    siteDetails: inquiry.siteDetails,
    fullAddress: inquiry.fullAddress,
    googleMapsUrl: inquiry.googleMapsUrl ?? "",
    scheduleVisitDate: inquiry.scheduleVisitDate,
    scheduleVisitTime: inquiry.scheduleVisitTime,
    assignedPersonId: inquiry.assignedPersonId,
    notes: inquiry.notes,
  };
}

function EditInquiryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    void getInquiryById(id)
      .then(setInquiry)
      .catch(() => setError("Could not load inquiry."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUpdate(payload: CreateInquiryPayload) {
    if (!id) return;
    await updateInquiry(id, payload);
    setTimeout(() => navigate(`/inquiry/inquiries/${id}`), 800);
  }

  return (
    <AppShell activeNav="inquiries" pageTitle="Edit Inquiry" pageSubtitle={inquiry?.inquiryNumber ?? ""}>
      <div className="space-y-6">
          <Link to="/inquiry/inquiries" className="text-sm font-medium text-ui-primary hover:underline">
            Back to listing
          </Link>
          <section className={themeClasses.cardPadding}>
            {loading ? <p className="text-sm text-text-muted">Loading...</p> : null}
            {error ? <InlineFeedbackAlert type="err">{error}</InlineFeedbackAlert> : null}
            {!loading && inquiry ? (
              <InquiryForm mode="edit" initialValues={inquiryToPayload(inquiry)} onSubmit={handleUpdate} />
            ) : null}
          </section>
      </div>
    </AppShell>
  );
}

export default EditInquiryPage;


