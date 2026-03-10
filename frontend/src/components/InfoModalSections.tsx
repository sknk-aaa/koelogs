import type { ReactNode } from "react";

type InfoModalLeadProps = {
  children: ReactNode;
  muted?: boolean;
};

type InfoModalSectionProps = {
  icon: ReactNode;
  title: string;
  children: ReactNode;
};

type InfoModalItemProps = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  meta?: ReactNode;
  noDivider?: boolean;
};

export function InfoModalLead({ children, muted = false }: InfoModalLeadProps) {
  return <p className={muted ? "infoModal__lead infoModal__lead--muted" : "infoModal__lead"}>{children}</p>;
}

export function InfoModalSection({ icon, title, children }: InfoModalSectionProps) {
  return (
    <section className="infoModal__section">
      <div className="infoModal__sectionTitleRow">
        <span className="infoModal__sectionTitleIcon" aria-hidden="true">
          {icon}
        </span>
        <h3 className="infoModal__sectionTitle">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function InfoModalItems({ children }: { children: ReactNode }) {
  return <div className="infoModal__items">{children}</div>;
}

export function InfoModalItem({ icon, title, description, meta, noDivider = false }: InfoModalItemProps) {
  return (
    <article className={noDivider ? "infoModal__item infoModal__item--noDivider" : "infoModal__item"}>
      <span className="infoModal__itemIcon" aria-hidden="true">
        {icon}
      </span>
      <div className="infoModal__itemCopy">
        <div className="infoModal__itemTitle">{title}</div>
        <p className="infoModal__itemText">{description}</p>
        {meta ? <p className="infoModal__itemMeta">{meta}</p> : null}
      </div>
    </article>
  );
}
