import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const DESKTOP_MIN_PX = 1024;

type SidebarContextValue = {
  /** Desktop sidebar expanded (icon + labels) vs collapsed (icons only) */
  expanded: boolean;
  /** Mobile header menu drawer */
  mobileMenuOpen: boolean;
  isMobile: boolean;
  toggle: () => void;
  close: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readIsMobile() {
  return typeof window !== "undefined" && window.innerWidth < DESKTOP_MIN_PX;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(readIsMobile);
  const [expanded, setExpanded] = useState(() => !readIsMobile());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopUserToggled, setDesktopUserToggled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_PX}px)`);
    const sync = () => {
      const mobile = !mq.matches;
      setIsMobile(mobile);
      setMobileMenuOpen(false);
      if (mobile) {
        return;
      }
      if (!desktopUserToggled) {
        setExpanded(true);
      }
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [desktopUserToggled]);

  const toggle = useCallback(() => {
    const mobile = typeof window !== "undefined" && window.innerWidth < DESKTOP_MIN_PX;
    if (mobile) {
      setMobileMenuOpen((v) => !v);
      return;
    }
    setDesktopUserToggled(true);
    setExpanded((v) => !v);
  }, []);

  const close = useCallback(() => {
    const mobile = typeof window !== "undefined" && window.innerWidth < DESKTOP_MIN_PX;
    if (mobile) {
      setMobileMenuOpen(false);
      return;
    }
    setDesktopUserToggled(true);
    setExpanded(false);
  }, []);

  const value = useMemo(
    () => ({ expanded, mobileMenuOpen, isMobile, toggle, close }),
    [expanded, mobileMenuOpen, isMobile, toggle, close],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}
