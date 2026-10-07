import woodieLogo from "../../assets/logo/Woodie.png";
import { COLORS } from "../../constants/colors";

type SidebarLogoProps = {
  expanded?: boolean;
};

export default function SidebarLogo({ expanded = true }: SidebarLogoProps) {
  return (
    <div
      className="flex w-full shrink-0 items-center justify-center"
      style={{
        padding: "16px 12px",
        borderBottom: `1px solid ${COLORS.sidebar.border}`,
        backgroundColor: COLORS.sidebar.bg,
      }}
    >
      <img
        src={woodieLogo}
        alt="Woodie ERP"
        className={
          expanded
            ? "block h-10 w-auto max-w-[176px] object-contain"
            : "block h-9 w-9 object-contain"
        }
        draggable={false}
      />
    </div>
  );
}
