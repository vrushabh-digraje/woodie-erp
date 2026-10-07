import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { themeClasses } from "../../../theme/classes";
import { useAuth } from "../../auth/AuthContext";
import { canManageBoq } from "../../auth/permissions";
import type { Inquiry } from "../services/inquiryTypes";
import { createQuotationForInquiry, getQuotationByInquiryId } from "../../boq/boqApi";
import { BoqFeedbackPopup, useBoqFeedback } from "../../boq/boqFeedback";
import { formatMoney, StatusBadge } from "../../boq/boqShared";
import type { BoqQuotation } from "../../boq/boqTypes";

type InquiryBoqCtaProps = {
  inquiry: Inquiry;
  className?: string;
  /** Fired when BOQ existence is known (e.g. lock site survey edits). */
  onBoqStatus?: (prepared: boolean) => void;
};

function InquiryBoqCta({ inquiry, className = "", onBoqStatus }: InquiryBoqCtaProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? "admin";
  const canCreate = canManageBoq(role);
  const [quotation, setQuotation] = useState<BoqQuotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { msg, notifyErr, dismiss } = useBoqFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getQuotationByInquiryId(inquiry._id);
      setQuotation(data);
      onBoqStatus?.(Boolean(data));
    } catch {
      setQuotation(null);
      // Leave inquiry.boqPrepared alone on errors (e.g. field roles cannot list BOQ).
    } finally {
      setLoading(false);
    }
  }, [inquiry._id, onBoqStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreateBoq() {
    setCreating(true);
    dismiss();
    try {
      const created = await createQuotationForInquiry(inquiry._id);
      setQuotation(created);
      onBoqStatus?.(true);
      navigate(`/boq/${created._id}`);
    } catch (err) {
      notifyErr(err, "Could not start BOQ preparation.");
    } finally {
      setCreating(false);
    }
  }

  if (inquiry.status !== "Site Report Attached") return null;
  if (!canCreate && !quotation && !loading) return null;

  return (
    <>
      <BoqFeedbackPopup msg={msg} onDismiss={dismiss} />
      <div
        className={`mt-4 rounded-xl border border-gray-300 bg-gradient-to-r from-brand-navy/[0.07] via-brand-primary/[0.06] to-brand-navy/[0.04] p-4 shadow-[0_4px_16px_rgba(26,29,33,0.06)] ${className}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">          
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-navy">Next step: BOQ & quotation</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {loading
                  ? "Checking BOQ status…"
                  : quotation
                    ? `${quotation.quotationNumber} · ${formatMoney(quotation.grandTotal)}`
                    : "Site work items are ready — start BOQ to add unit prices and build the quotation."}
              </p>
            </div>
          </div>

          {loading ? (
            <span className="text-sm text-text-muted sm:shrink-0">Loading…</span>
          ) : quotation ? (
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <StatusBadge status={quotation.status} />
              <Link
                to={`/boq/${quotation._id}`}
                className={`${themeClasses.btnNavy} inline-flex w-full sm:w-auto`}
              >
                Open BOQ
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : canCreate ? (
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleCreateBoq()}
              className={`${themeClasses.btnNavy} inline-flex w-full px-6 py-3 text-base shadow-[0_4px_14px_rgba(26,29,33,0.18)] sm:w-auto sm:shrink-0`}
            >
              {creating ? "Starting…" : "Start BOQ preparation"}
              {!creating ? <ArrowRight className="h-4 w-4" /> : null}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default InquiryBoqCta;
