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
    console.info("[section:public-loaded]", { pageId, sections: visibleSections.map((section) => ({ id: section.id, blockCount: section.published?.content.blocks.length ?? 0 })) });
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
          {content.blocks.length > 0 && <div className="published-section-blocks">{content.blocks.map((block) => {
            if (block.type === "text") return block.text ? <p key={block.id} className="published-section-text-block">{block.text}</p> : null;
            if (block.type === "button") return block.label && block.href ? <a key={block.id} className="published-section-button-block" href={block.href}>{block.label}<span aria-hidden="true">→</span></a> : null;
            return block.src ? <figure key={block.id} className="published-section-image-block">
              {/* Arbitrary CMS URLs are validated server-side and intentionally rendered without a fixed remote-image allowlist. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.src} alt={block.alt} />
            </figure> : null;
          })}</div>}
        </section>
      );
    });
  } catch (error) {
    console.error("[section:public-load-failed]", { pageId, error });
    return null;
  }
}
