import Link from "next/link";
import { ChevronRight, Pin } from "lucide-react";
import clsx from "clsx";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import { CONTENT_TYPE_LABEL } from "../../content/constants";
import type { MobileContentPost } from "../../content/types";
import { excerptBody, formatContentDate } from "../../content/utils";
import styles from "./content.module.css";

interface ContentPostCardProps {
  post: MobileContentPost;
  pinnedHighlight?: boolean;
}

function typeBadgeClass(type: string): string {
  switch (type) {
    case "NOTICE":
      return styles.typeNotice;
    case "GUIDE":
      return styles.typeGuide;
    case "POLICY":
      return styles.typePolicy;
    default:
      return styles.typeDefault;
  }
}

export default function ContentPostCard({ post, pinnedHighlight = false }: ContentPostCardProps) {
  const published = formatContentDate(post.publishAt);
  const showPinned = post.isPinned || pinnedHighlight;

  return (
    <Link
      href={`${MOBILE_ROUTES.customer.content}/${post.id}`}
      className={clsx(styles.postCard, showPinned && styles.postCardPinned)}
    >
      <div className={styles.postCardTop}>
        <div className={styles.postCardMeta}>
          <span className={clsx(styles.typeBadge, typeBadgeClass(post.type))}>
            {CONTENT_TYPE_LABEL[post.type] ?? post.type}
          </span>
          {showPinned ? (
            <span className={styles.pinnedBadge}>
              <Pin size={10} aria-hidden />
              Pinned
            </span>
          ) : null}
          {published ? <span className={styles.postDate}>{published}</span> : null}
        </div>
        <ChevronRight className={styles.postChevron} size={18} aria-hidden />
      </div>
      <h3 className={styles.postTitle}>{post.title}</h3>
      <p className={styles.postExcerpt}>{excerptBody(post.body)}</p>
    </Link>
  );
}
