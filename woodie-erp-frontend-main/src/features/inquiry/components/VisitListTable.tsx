import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, CalendarPlus, Tag } from "lucide-react";
import {
  DataTable,
  DataTableHeadRow,
  DataTableHeader,
  DataTableTh,
} from "../../../components/list/DataTable";
import { TruncatedText } from "../../../components/TruncatedText";
import { themeClasses } from "../../../theme/classes";
import { googleCalendarEventUrl, siteVisitCalendarParamsFromInquiry } from "../calendarUtils";
import type { Inquiry, InquiryStatus } from "../services/inquiryTypes";
import { StatusBadge } from "./inquiryShared";
import { visitDateToInputValue } from "../mapUtils";

const statusRowAccent: Record<InquiryStatus, string> = {
  "Visit Pending Approval": "border-l-amber-500",
  "Visit Approved": "border-l-brand-gold",
  "Visit Rejected": "border-l-rose-500",
  "Site Report Attached": "border-l-emerald-600",
  Won: "border-l-emerald-600",
  Lost: "border-l-rose-500",
};

const statusCta: Record<InquiryStatus, string> = {
  "Visit Pending Approval": "Review & approve",
  "Visit Approved": "Complete survey",
  "Visit Rejected": "View details",
  "Site Report Attached": "View report",
  Won: "View details",
  Lost: "View details",
};

type VisitListTableProps = {
  visits: Inquiry[];
};

function VisitRowActions({ item }: { item: Inquiry }) {
  return (
    <Link
      to={`/inquiry/inquiries/${item._id}`}
      className={`${themeClasses.btnPrimary} inline-flex whitespace-nowrap px-3 py-2 text-xs`}
    >
      {statusCta[item.status]}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function VisitListTable({ visits }: VisitListTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-surface-border">
      <ul className="divide-y divide-surface-border md:hidden">
        {visits.map((item) => {
          const visitDate = visitDateToInputValue(item.scheduleVisitDate);
          return (
            <li
              key={item._id}
              className={`border-l-4 bg-white p-4 ${statusRowAccent[item.status]}`}
            >
              <p className="font-mono text-xs font-semibold text-brand-gold-muted">{item.inquiryNumber}</p>
              <p className="truncate font-semibold text-text-primary">{item.clientName}</p>
              <p className="mt-1 text-xs text-text-muted">
                {item.category} · {visitDate} {item.scheduleVisitTime}
              </p>
              <div className="mt-2">
                <StatusBadge status={item.status} short />
              </div>
              <div className="mt-3">
                <VisitRowActions item={item} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden md:block">
        <DataTable className="border-0 shadow-none">
          <DataTableHeader>
            <DataTableHeadRow>
              <DataTableTh>Inquiry</DataTableTh>
              <DataTableTh>Client</DataTableTh>
              <DataTableTh>Category</DataTableTh>
              <DataTableTh>Visit</DataTableTh>
              <DataTableTh>Status</DataTableTh>
              <DataTableTh align="right">Action</DataTableTh>
            </DataTableHeadRow>
          </DataTableHeader>
          <tbody>
            {visits.map((item) => {
              const visitDate = visitDateToInputValue(item.scheduleVisitDate);
              const visitScheduled =
                item.status === "Visit Approved" || item.status === "Site Report Attached";
              const calendarUrl = visitScheduled
                ? googleCalendarEventUrl(siteVisitCalendarParamsFromInquiry(item))
                : null;

              return (
                <tr
                  key={item._id}
                  className={`border-b border-surface-border/80 border-l-4 bg-white transition last:border-b-0 hover:bg-surface-muted ${statusRowAccent[item.status]}`}
                >
                  <td className="max-w-[5rem] px-4 py-3.5 align-top">
                    <TruncatedText text={item.inquiryNumber} maxClass="max-w-[5rem]" className="font-mono text-xs font-semibold uppercase text-brand-gold-muted" />
                  </td>
                  <td className="max-w-[8rem] px-4 py-3.5 align-top">
                    <TruncatedText text={item.clientName} maxClass="max-w-[8rem]" className="font-semibold" />
                  </td>
                  <td className="max-w-[7rem] px-4 py-3.5 align-top">
                    <span className="inline-flex max-w-full items-center gap-1 rounded-lg bg-brand-navy/8 px-2 py-1 text-xs font-medium text-brand-navy">
                      <Tag className="h-3.5 w-3.5 shrink-0 text-brand-gold-muted" />
                      <TruncatedText text={item.category} maxClass="max-w-[5rem]" />
                    </span>
                  </td>
                  <td className="max-w-[9rem] px-4 py-3.5 align-top">
                    <span className="inline-flex max-w-full items-center gap-1 text-xs text-text-secondary">
                      <CalendarClock className="h-3.5 w-3.5 shrink-0 text-brand-gold-muted" />
                      <TruncatedText
                        text={`${visitDate} · ${item.scheduleVisitTime}`}
                        maxClass="max-w-[7rem]"
                      />
                    </span>
                    {calendarUrl ? (
                      <a
                        href={calendarUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-[#4285F4]/10 px-2 py-0.5 text-[11px] font-semibold text-[#3367d6] hover:bg-[#4285F4]/20"
                      >
                        <CalendarPlus className="h-3 w-3" />
                        Google Calendar
                      </a>
                    ) : null}
                  </td>
                  <td className="max-w-[8rem] px-4 py-3.5 align-top">
                    <StatusBadge status={item.status} short />
                    {item.status === "Visit Rejected" && item.visitApproval?.rejectionReason ? (
                      <p className="mt-1">
                        <TruncatedText
                          text={item.visitApproval.rejectionReason}
                          maxClass="max-w-[8rem]"
                          className="text-[11px] text-rose-600"
                        />
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5 align-top text-right">
                    <VisitRowActions item={item} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </div>
    </div>
  );
}

export default VisitListTable;
