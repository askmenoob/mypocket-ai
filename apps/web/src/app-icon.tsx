type AppIconProps = {
  name:string;
  size?:number;
  strokeWidth?:number;
  className?:string;
};

export function AppIcon({
  name,
  size = 18,
  strokeWidth = 1.9,
  className,
}:AppIconProps){
  let content:any;

  switch(name){
    case "wallet":
      content = (
        <>
          <path d="M5 6.5V5a2 2 0 0 1 2-2h10.5a1.5 1.5 0 0 1 0 3H7" />
          <rect x="3" y="6" width="18" height="15" rx="3" />
          <path d="M15.5 11H21v5h-5.5a2.5 2.5 0 0 1 0-5Z" />
          <circle cx="16.5" cy="13.5" r=".7" fill="currentColor" stroke="none" />
        </>
      );
      break;

    case "calendar":
      content = (
        <>
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M3 10h18" />
          <path d="M7.5 14h2" />
          <path d="M11 14h2" />
          <path d="M14.5 14h2" />
          <path d="M7.5 17.5h2" />
          <path d="M11 17.5h2" />
          <path d="M14.5 17.5h2" />
        </>
      );
      break;

    case "whatsapp":
      content = (
        <>
          <path d="M20.7 11.6a8.7 8.7 0 0 1-12.9 7.6L3.2 20.5l1.4-4.4A8.7 8.7 0 1 1 20.7 11.6Z" />
          <path d="M8.4 7.8c.2-.5.5-.6.8-.6h.6c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.6.8c-.2.2-.1.5.1.8.7 1.2 1.7 2.1 3 2.7.3.2.6.2.8 0l.9-1c.2-.2.5-.3.8-.1l1.7.8c.3.1.4.3.4.6 0 .5-.2 1.4-.7 1.9-.5.5-1.4.8-2.2.7-1.2-.1-2.8-.6-4.6-2.1-2.1-1.7-3.4-3.8-3.8-5.2-.3-1-.1-1.7.3-2.2Z" />
        </>
      );
      break;

    case "sheet":
      content = (
        <>
          <path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M14 3v5h5" />
          <path d="M8 11h7" />
          <path d="M8 15h7" />
          <path d="M8 19h7" />
          <path d="M11 11v8" />
        </>
      );
      break;

    case "home":
      content = (
        <>
          <path d="m3 11 9-8 9 8" />
          <path d="M5 10v11h14V10" />
          <path d="M9 21v-7h6v7" />
        </>
      );
      break;

    case "transactions":
      content = (
        <>
          <rect x="4" y="3" width="16" height="18" rx="2.5" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
          <path d="m16 15 2 2 3-4" />
        </>
      );
      break;

    case "users":
      content = (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 20c.3-4 2.1-6 5.5-6s5.2 2 5.5 6" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M15.6 14.8c3-.2 4.7 1.4 4.9 4.2" />
        </>
      );
      break;

    case "settings":
      content = (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3A1.7 1.7 0 0 0 14 21v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14h-.2v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </>
      );
      break;

    case "plus":
      content = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </>
      );
      break;

    case "power":
      content = (
        <>
          <path d="M12 2v10" />
          <path d="M6.2 5.8a8 8 0 1 0 11.6 0" />
        </>
      );
      break;

    case "check":
      content = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.6 2.7L16.5 9" />
        </>
      );
      break;

    case "refresh":
      content = (
        <>
          <path d="M20 6v5h-5" />
          <path d="M4 18v-5h5" />
          <path d="M6.1 8.2A7 7 0 0 1 18.8 11" />
          <path d="M17.9 15.8A7 7 0 0 1 5.2 13" />
        </>
      );
      break;

    case "eye":
      content = (
        <>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      );
      break;

    case "external":
      content = (
        <>
          <path d="M14 4h6v6" />
          <path d="m20 4-9 9" />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </>
      );
      break;

    case "link":
      content = (
        <>
          <path d="M10 13a5 5 0 0 0 7.1.1l2-2A5 5 0 0 0 12 4l-1.1 1.1" />
          <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
        </>
      );
      break;

    case "rotate":
      content = (
        <>
          <path d="M20 7v5h-5" />
          <path d="M4 17v-5h5" />
          <path d="M6.2 7.8A8 8 0 0 1 20 12" />
          <path d="M17.8 16.2A8 8 0 0 1 4 12" />
        </>
      );
      break;

    default:
      content = (
        <circle cx="12" cy="12" r="8" />
      );
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {content}
    </svg>
  );
}
