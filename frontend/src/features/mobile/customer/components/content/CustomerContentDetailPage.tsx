"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { ArrowLeft, Pin } from "lucide-react";
import clsx from "clsx";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import * as ContentApi from "../../content/query";
import { CONTENT_TYPE_LABEL } from "../../content/constants";
import { formatContentDate } from "../../content/utils";
import styles from "./content.module.css";

interface CustomerContentDetailPageProps {
  contentId: string;
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

export default function CustomerContentDetailPage({ contentId }: CustomerContentDetailPageProps) {
  const detailQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["content", contentId]),
    queryFn: () => ContentApi.getCustomerContent(contentId),
  });

  const post = detailQuery.data;
  const published = formatContentDate(post?.publishAt);
  const expires =
    post?.expireAt && dayjs(post.expireAt).isValid()
      ? dayjs(post.expireAt).format("D MMM YYYY")
      : null;

  if (detailQuery.isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading…</span>
      </div>
    );
  }

  if (detailQuery.isError || !post) {
    return (
      <div className={styles.page}>
        <Link href={MOBILE_ROUTES.customer.content} className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden />
          Back to notices
        </Link>
        <div className={styles.errorWrap}>
          Content not found.
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => void detailQuery.refetch()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href={MOBILE_ROUTES.customer.content} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        Back to notices
      </Link>

      <article className={styles.articleCard}>
        <div className={styles.articleMeta}>
          <span className={clsx(styles.typeBadge, typeBadgeClass(post.type))}>
            {CONTENT_TYPE_LABEL[post.type] ?? post.type}
          </span>
          {post.isPinned ? (
            <span className={styles.pinnedBadge}>
              <Pin size={10} aria-hidden />
              Pinned
            </span>
          ) : null}
        </div>

        <h1 className={styles.articleTitle}>{post.title}</h1>

        {published || expires ? (
          <div className={styles.articleDates}>
            {published ? <span>Published {published}</span> : null}
            {expires ? <span>Valid until {expires}</span> : null}
          </div>
        ) : null}

        <div className={styles.articleBody}>{post.body}</div>
      </article>
    </div>
  );
}
