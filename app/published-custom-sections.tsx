import Link from "next/link";
import { getContentSectionDb, listPublishedContentSections } from "../db/content-sections";
import { publishedDeletionSet } from "../db/content-deletions";
import { listVisibility } from "../db/content-visibility";

export async function PublishedCustomSections({ pageId }: { pageId: string }) {
  try {
    const db = await getContentSectionDb();
    const [sections, visibility, deleted] = await Promise.all([
      listPublishedContentSections(db, pageId),
      listVisibility(db),
      publishedDeletionSet(db),
    ]);
    const visibleSections = sections.filter((section) => {
      if (deleted.has(`section:${section.id}`)) return false;
      const record = visibility.find((item) => item.entityType === "section" && item.entityId === section.id);
      return record?.published.menuVisible ?? true;
    });
    console.info("[section:public-loaded]", { pageId, sectionIds: visibleSections.map((section) => section.id) });
    return visibleSections.map((section, index) => {
      const content = section.published!.content;
      return (
        <section
          key={section.id}
          className="published-custom-section"
          aria-labelledby={`${section.id}-title`}
          data-content-section-id={section.id}
          data-visibility-entity-type="section"
          data-visibility-entity-id={section.id}
        >
          <span className="published-custom-section-index">Section {String(index + 1).padStart(2, "0")}</span>
          <p className="published-custom-section-eyebrow">{content.eyebrow}</p>
          <h2 id={`${section.id}-title`}><span>{content.headlinePrimary}</span><em>{content.headlineAccent}</em></h2>
          <h3>{content.subheadline}</h3>
          <p className="published-custom-section-description">{content.description}</p>
          {content.ctaLabel && <Link href="/contact">{content.ctaLabel}<span aria-hidden="true">↗</span></Link>}
        </section>
      );
    });
  } catch (error) {
    console.error("[section:public-load-failed]", { pageId, error });
    return null;
  }
}
