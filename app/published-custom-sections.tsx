import { getContentSectionDb, listPublishedContentSections, type SectionBlock } from "../db/content-sections";
import { publishedDeletionSet } from "../db/content-deletions";
import { listVisibility } from "../db/content-visibility";
import { SectionTemplateRenderer } from "./section-template-renderers";

function PublishedSectionBlocks({ blocks }: { blocks: SectionBlock[] }) {
  if (blocks.length === 0) return null;
  return (
    <div className="template-auxiliary-blocks">
      {blocks.map((block) => {
        if (block.type === "text") return block.text ? <p key={block.id}>{block.text}</p> : null;
        if (block.type === "button") return block.label && block.href ? <a key={block.id} href={block.href}>{block.label}<span aria-hidden="true">↗</span></a> : null;
        return block.src ? <figure key={block.id}>
          {/* CMS URLs are validated before storage and may use project-owned remote hosts. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.src} alt={block.alt} />
        </figure> : null;
      })}
    </div>
  );
}

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
    console.info("[section:public-loaded]", {
      pageId,
      sections: visibleSections.map((section) => ({
        id: section.id,
        templateId: section.published?.content.templateId,
        itemCount: section.published?.content.items.length ?? 0,
        blockCount: section.published?.content.blocks.length ?? 0,
      })),
    });
    return visibleSections.map((section, index) => {
      const content = section.published!.content;
      return (
        <section
          key={section.id}
          className={`template-section template-section--${content.templateId}`}
          aria-labelledby={`${section.id}-title`}
          data-content-section-id={section.id}
          data-section-template={content.templateId}
          data-visibility-entity-type="section"
          data-visibility-entity-id={section.id}
        >
          <span className="template-section-index" aria-hidden="true">Section {String(index + 1).padStart(2, "0")}</span>
          <SectionTemplateRenderer content={content} sectionId={section.id} />
          <PublishedSectionBlocks blocks={content.blocks} />
        </section>
      );
    });
  } catch (error) {
    console.error("[section:public-load-failed]", { pageId, error });
    return null;
  }
}