/** Bubble Tea Palace logo mark — cup with boba pearls in brand colors. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#3F201B" />
      {/* straw */}
      <rect x="26" y="7" width="4" height="14" rx="2" fill="#F9A72A" transform="rotate(14 28 14)" />
      {/* cup */}
      <path
        d="M15 17h18l-2.4 21a3 3 0 0 1-3 2.7h-7.2a3 3 0 0 1-3-2.7L15 17Z"
        fill="#FDF6EC"
      />
      {/* tea level */}
      <path d="M16.2 27.5h15.6l-1.1 10.5a3 3 0 0 1-3 2.7h-7.2a3 3 0 0 1-3-2.7l-1.3-10.5Z" fill="#F9A72A" fillOpacity=".85" />
      {/* boba pearls */}
      <circle cx="20.5" cy="36.5" r="1.9" fill="#3F201B" />
      <circle cx="24.5" cy="37.5" r="1.9" fill="#3F201B" />
      <circle cx="28" cy="36" r="1.9" fill="#3F201B" />
      {/* cup rim */}
      <rect x="14" y="15" width="20" height="3.4" rx="1.7" fill="#F9A72A" />
    </svg>
  );
}
