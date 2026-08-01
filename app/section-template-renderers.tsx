import type { ReactNode } from "react";
import type { SectionContent, SectionTemplateId, SectionTemplateItem } from "../db/content-sections";
import { getSectionTemplateDefinition } from "../lib/section-templates";
import { ContactSubmissionForm } from "./contact-submission-form";

type RendererProps = { content: SectionContent; sectionId: string };
type Renderer = (props: RendererProps) => ReactNode;

function itemLink(item: SectionTemplateItem, children: ReactNode, className?: string) {
  if (!item.href) return <article className={className}>{children}</article>;
  return <a className={className} href={item.href}>{children}</a>;
}

function itemImage(item: SectionTemplateItem) {
  if (!item.imageSrc) return <span className="template-card-placeholder" aria-hidden="true" />;
  return (
    <figure className="template-card-image">
      {/* CMS URLs are validated before storage and may use project-owned remote hosts. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.imageSrc} alt={item.imageAlt} />
    </figure>
  );
}

function headline(content: SectionContent) {
  return <h2><span>{content.headlinePrimary}</span><em>{content.headlineAccent}</em></h2>;
}

function EditorialHero({ content }: RendererProps) {
  return (
    <div className="template-inner template-hero-inner">
      <p className="template-eyebrow">{content.eyebrow}</p>
      {headline(content)}
      <div className="template-hero-lower">
        <div><h3>{content.subheadline}</h3><p>{content.description}</p></div>
        <div className="template-metric-grid">
          {content.items.map((item) => <article key={item.id}><strong>{item.meta}</strong><span>{item.title}</span></article>)}
        </div>
      </div>
      {content.ctaLabel && <a className="template-primary-action" href={content.items.find((item) => item.href)?.href || "/contact"}>{content.ctaLabel}<span aria-hidden="true">↘</span></a>}
    </div>
  );
}

function ProfileStory({ content }: RendererProps) {
  return (
    <div className="template-inner template-profile-inner">
      <div className="template-profile-heading"><p className="template-eyebrow">{content.eyebrow}</p>{headline(content)}</div>
      <div className="template-profile-copy"><h3>{content.subheadline}</h3><p>{content.description}</p></div>
      <ol className="template-profile-list">
        {content.items.map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong><small>{item.meta}</small></li>)}
      </ol>
    </div>
  );
}

function BrandWall({ content }: RendererProps) {
  return (
    <div className="template-inner template-brand-inner">
      <div className="template-section-heading"><p className="template-eyebrow">{content.eyebrow}</p>{headline(content)}<p>{content.description}</p></div>
      <div className="template-brand-grid">
        {content.items.map((item, index) => <article key={item.id}><span>{String(index + 1).padStart(2, "0")}</span>{item.imageSrc ? itemImage(item) : <strong>{item.title}</strong>}</article>)}
      </div>
    </div>
  );
}

function MediaGrid({ content }: RendererProps) {
  return (
    <div className="template-inner template-media-inner">
      <div className="template-section-heading"><p className="template-eyebrow">{content.eyebrow}</p>{headline(content)}<p>{content.subheadline}</p></div>
      <div className="template-media-grid">
        {content.items.map((item, index) => <div key={item.id}>{itemLink(item, <><span className="template-card-index">Media {String(index + 1).padStart(2, "0")}</span>{itemImage(item)}<h3>{item.title}</h3><p>{item.description || item.meta}</p><span className="template-card-arrow" aria-hidden="true">↗</span></>, "template-media-card")}</div>)}
      </div>
    </div>
  );
}

function ProjectGrid({ content, sectionId }: RendererProps) {
  return (
    <div className="template-inner template-project-inner">
      <div className="template-section-heading"><p className="template-eyebrow">{content.eyebrow}</p>{headline(content)}<p>{content.subheadline}</p></div>
      <div className="template-project-grid" aria-labelledby={`${sectionId}-title`}>
        {content.items.map((item, index) => <div key={item.id}>{itemLink(item, <>{itemImage(item)}<div><span>{item.meta || `Project ${String(index + 1).padStart(2, "0")}`}</span><h3>{item.title}</h3><p>{item.description}</p></div></>, "template-project-card")}</div>)}
      </div>
    </div>
  );
}

function ClassCards({ content }: RendererProps) {
  return (
    <div className="template-inner template-class-inner">
      <div className="template-section-heading"><p className="template-eyebrow">{content.eyebrow}</p>{headline(content)}<p>{content.subheadline}</p></div>
      <div className="template-class-grid">
        {content.items.map((item, index) => <div key={item.id}>{itemLink(item, <><span>{item.meta || `Program ${String(index + 1).padStart(2, "0")}`}</span><h3>{item.title}</h3><p>{item.description}</p><strong>{item.href ? "자세히 보기 ↗" : "프로그램 정보"}</strong></>, "template-class-card")}</div>)}
      </div>
    </div>
  );
}

function ContactFormTemplate({ content }: RendererProps) {
  const endpoint = getSectionTemplateDefinition("contactForm").submissionEndpoint!;
  return (
    <div className="template-inner template-contact-inner">
      <div className="template-contact-copy"><p className="template-eyebrow">{content.eyebrow}</p>{headline(content)}<h3>{content.subheadline}</h3><p>{content.description}</p></div>
      <ContactSubmissionForm endpoint={endpoint} submitLabel={content.ctaLabel || "문의 보내기"} />
    </div>
  );
}

function FooterBand({ content }: RendererProps) {
  return (
    <div className="template-inner template-footer-inner">
      <p className="template-eyebrow">{content.eyebrow}</p>
      {headline(content)}
      <div className="template-footer-row">
        <p>{content.description}</p>
        <nav aria-label="섹션 푸터 링크">
          {content.items.map((item) => <a key={item.id} href={item.href || (item.title === "Home" ? "/home" : item.title === "Contact" ? "/contact" : item.title === "Vlog" ? "/vlog" : "/home")}>{item.title}</a>)}
        </nav>
        {content.ctaLabel && <a className="template-primary-action" href="/contact">{content.ctaLabel}<span aria-hidden="true">↗</span></a>}
      </div>
    </div>
  );
}

export const SECTION_TEMPLATE_RENDERERS: Record<SectionTemplateId, Renderer> = {
  editorialHero: EditorialHero,
  profileStory: ProfileStory,
  brandWall: BrandWall,
  mediaGrid: MediaGrid,
  projectGrid: ProjectGrid,
  classCards: ClassCards,
  contactForm: ContactFormTemplate,
  footerBand: FooterBand,
};

export function SectionTemplateRenderer(props: RendererProps) {
  const Renderer = SECTION_TEMPLATE_RENDERERS[props.content.templateId];
  console.info("[section:renderer-selected]", { sectionId: props.sectionId, templateId: props.content.templateId });
  return <><span className="sr-only" id={`${props.sectionId}-title`}>{props.content.headlinePrimary} {props.content.headlineAccent}</span><Renderer {...props} /></>;
}

