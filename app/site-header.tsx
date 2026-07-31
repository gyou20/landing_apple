"use client";

import { useSiteContent } from "./use-site-content";

const ROUTES = [
  { href: "/home", id: "home", label: "Home" },
  { href: "/contact", id: "contact", label: "Contact" },
  { href: "/vlog", id: "vlog", label: "Vlog" },
] as const;

export function SiteHeader({
  className = "route-site-header",
  currentPage,
  pageNumber,
}: {
  className?: string;
  currentPage: (typeof ROUTES)[number]["id"];
  pageNumber: string;
}) {
  const { brandName } = useSiteContent();

  return (
    <nav
      className={`${className} site-header`}
      aria-label="주요 페이지 내비게이션"
      data-page-number={pageNumber}
      data-testid="site-header"
    >
      <div className="site-header-identity">
        <a className="brand-link" href="/home" aria-label={`${brandName} 홈`}>
          <span className="wordmark" aria-label={brandName}>
            <span className="wordmark-mark" aria-hidden="true">
              ◐
            </span>
            {brandName}
          </span>
        </a>
        <span className="page-marker" aria-hidden="true">
          Page {pageNumber}
        </span>
      </div>

      <div className="route-links">
        {ROUTES.map((route) => (
          <a
            key={route.id}
            href={route.href}
            aria-current={currentPage === route.id ? "page" : undefined}
            data-route-id={route.id}
          >
            {route.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
