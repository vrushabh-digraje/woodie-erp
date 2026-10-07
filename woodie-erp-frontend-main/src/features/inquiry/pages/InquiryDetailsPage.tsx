import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import AppShell from "../../../components/layout/AppShell";
import { AppFeedbackPopup, useAppFeedback } from "../../../components/AppFeedback";
import { useAuth } from "../../auth/AuthContext";
import {
  canApproveVisit,
  canEditSiteSurvey,
  canSubmitSiteSurvey,
  isAssignedToInquiry,
} from "../../auth/permissions";
import AssigneeVisitCard from "../components/AssigneeVisitCard";
import InquiryOverviewPanel from "../components/InquiryOverviewPanel";
import SiteSurveyPanel from "../components/SiteSurveyPanel";
import { ActivityTimeline, EmptyState, RejectionBanner } from "../components/inquiryShared";
import { googleCalendarEventUrl, siteVisitCalendarParamsFromInquiry } from "../calendarUtils";
import { decideVisitApproval, getInquiryById } from "../services/inquiryApi";
import type { Inquiry, VisitApprovalDecision } from "../services/inquiryTypes";

function InquiryDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalDecision, setApprovalDecision] = useState<VisitApprovalDecision>("Approved");
  const [rejectionReason, setRejectionReason] = useState("");
  const { msg, notifyOk, notifyErr, notifyErrText, dismiss } = useAppFeedback();

  const handleSurveyMessage = useCallback(
    (m: { type: "ok" | "err"; text: string } | null) => {
      if (!m) {
        dismiss();
        return;
      }
      if (m.type === "ok") notifyOk(m.text);
      else notifyErrText(m.text);
    },
    [dismiss, notifyOk, notifyErrText],
  );
  const assigned = inquiry && user ? isAssignedToInquiry(inquiry, user) : false;
  const showApproval = inquiry && user ? canApproveVisit(inquiry, user) : false;
  const canEditSurvey = inquiry && user ? canEditSiteSurvey(inquiry, user) : false;
  const canSubmitSurvey = inquiry && user ? canSubmitSiteSurvey(inquiry, user) : false;

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getInquiryById(id!);
        if (!mounted) return;
        setInquiry(data);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  async function handleApproval(e: FormEvent) {
    e.preventDefault();
    if (!inquiry) return;
    try {
      const updated = await decideVisitApproval(inquiry._id, {
        decision: approvalDecision,
        rejectionReason: approvalDecision === "Rejected" ? rejectionReason : "",
      });
      setInquiry(updated);
      notifyOk(approvalDecision === "Approved" ? "Visit approved." : "Visit rejected.");
    } catch (err: unknown) {
      notifyErr(err, "Failed to submit decision.");
    }
  }

  const TIMELINE_ACTIONS = new Set([
    "Inquiry Created",
    "Visit Assigned",
    "Visit Approved",
    "Visit Rejected",
    "Site Report Uploaded",
  ]);
  const timeline = (inquiry?.activityTimeline ?? []).filter((a) => TIMELINE_ACTIONS.has(a.action));

  const visitScheduled =
    inquiry?.status === "Visit Approved" || inquiry?.status === "Site Report Attached";
  const calendarUrl =
    inquiry && assigned && visitScheduled
      ? googleCalendarEventUrl(siteVisitCalendarParamsFromInquiry(inquiry))
      : null;
  const showAssigneeVisitCard = Boolean(inquiry && assigned && (visitScheduled || inquiry.fullAddress));

  return (
    <AppShell
      activeNav="inquiries"
      pageTitle={inquiry ? inquiry.inquiryNumber : "Inquiry"}
    >
      <AppFeedbackPopup msg={msg} onDismiss={dismiss} />
      <div className="space-y-6">
          {loading ? (
            <p className="text-sm text-text-muted">Loading...</p>
          ) : !inquiry ? (
            <EmptyState message="Inquiry not found." />
          ) : (
            <>
              {inquiry.status === "Visit Rejected" ? (
                <RejectionBanner reason={inquiry.visitApproval?.rejectionReason ?? ""} />
              ) : null}

              <InquiryOverviewPanel inquiry={inquiry} />

              {showAssigneeVisitCard ? (
                <AssigneeVisitCard
                  scheduleVisitDate={inquiry.scheduleVisitDate}
                  scheduleVisitTime={inquiry.scheduleVisitTime}
                  fullAddress={inquiry.fullAddress}
                  googleMapsUrl={inquiry.googleMapsUrl}
                  visitScheduled={visitScheduled}
                  calendarUrl={calendarUrl}
                />
              ) : null}

              {showApproval ? (
                <article className="app-card p-5">
                  <h3 className="mb-3 font-semibold">Approve or reject visit</h3>
                  <form onSubmit={handleApproval} className="space-y-3">
                    <select
                      value={approvalDecision}
                      onChange={(e) => setApprovalDecision(e.target.value as VisitApprovalDecision)}
                      className="mr-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="Approved">Approve visit</option>
                      <option value="Rejected">Reject visit</option>
                    </select>
                    {approvalDecision === "Rejected" ? (
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={2}
                        required
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Rejection reason (required)"
                      />
                    ) : null}
                    <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
                      Submit decision
                    </button>
                  </form>
                </article>
              ) : null}

              {inquiry ? (
                <SiteSurveyPanel
                  inquiry={inquiry}
                  setInquiry={setInquiry}
                  canEdit={canEditSurvey}
                  canSubmit={canSubmitSurvey}
                  onMessage={handleSurveyMessage}
                />
              ) : null}

              <ActivityTimeline items={timeline} />

            </>
          )}
      </div>
    </AppShell>
  );
}

export default InquiryDetailsPage;








