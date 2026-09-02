import { LucideIcon, Inbox } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  sub?: string;
}

/** Faint chart-silhouette decoration behind the icon — gives empty states
 *  a lighter, more designed feel without a full illustration asset. */
function EmptyIllustration() {
  return (
    <svg
      width="120"
      height="64"
      viewBox="0 0 120 64"
      fill="none"
      aria-hidden
      style={{ opacity: 0.22, marginBottom: 8 }}
    >
      {/* Ghost bar chart */}
      <rect x="8" y="28" width="14" height="32" rx="3" fill="var(--brand-indigo)" />
      <rect x="28" y="16" width="14" height="44" rx="3" fill="var(--brand-teal)" />
      <rect x="48" y="36" width="14" height="24" rx="3" fill="var(--brand-violet)" />
      <rect x="68" y="22" width="14" height="38" rx="3" fill="var(--status-amber)" />
      {/* Ghost trend line */}
      <path
        d="M8 44 Q30 18 60 30 T112 16"
        stroke="var(--brand-indigo)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="5 4"
        fill="none"
      />
      {/* Baseline */}
      <line x1="4" y1="60" x2="116" y2="60" stroke="var(--border)" strokeWidth="1.5" />
    </svg>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, sub }: Props) {
  return (
    <div className="empty">
      <EmptyIllustration />
      <div className="empty-ic">
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <h3>{title}</h3>
      {sub && <p>{sub}</p>}
    </div>
  );
}
