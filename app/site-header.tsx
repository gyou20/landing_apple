"use client";

import Link from "next/link";
import type { PublicNavigationItem } from "../db/public-navigation";
import { useSiteContent } from "./use-site-content";

export function SiteHeader({
  className = "route-site-header",
  currentPage,
  pageNumber,
  items,
}: {
  className?: string;
  currentPage: string;
  pageNumber: string;
  items: PublicNavigationItem[];
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
        <Link className="brand-link" href="/home" aria-label={`${brandName} 홈`}>
          <span className="wordmark" aria-label={brandName}>
            <span className="wordmark-mark" aria-hidden="true">◐</span>
            {brandName}
          </span>
        </Link>
        <span className="page-marker" aria-hidden="true">Page {pageNumber}</span>
      </div>

      <div className="route-links">
        {items.map((route) => (
          <Link
            key={route.id}
            href={route.href}
            aria-current={currentPage === route.id ? "page" : undefined}
            data-route-id={route.id}
            data-visibility-entity-type="page"
            data-visibility-entity-id={route.id}
          >
            {route.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}