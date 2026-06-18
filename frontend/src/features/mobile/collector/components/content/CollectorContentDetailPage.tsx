"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { ArrowLeft } from "lucide-react";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import * as SharedApi from "../../shared/query";
import { CONTENT_TYPE_LABEL } from "../../support/constants";
import styles from "../support/support.module.css";

interface CollectorContentDetailPageProps {
  contentId: string;
}

export default function CollectorContentDetailPage({ contentId }: CollectorContentDetailPageProps) {
  const detailQuery = useQuery({
    queryKey: mobileQueryKey("collector", ["content", contentId]),
    queryFn: () => SharedApi.getCollectorContent(contentId),
  });

  const post = detailQuery.data;

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
        <Link href="/collector/content" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden />
          Back to guides
        </Link>
        <div className={styles.errorWrap}>Content not found.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/collector/content" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        Back to guides
      </Link>

      <article>
        {post.isPinned ? <span className={styles.pinnedBadge}>Pinned</span> : null}
        <div className={styles.contentMeta}>
          {CONTENT_TYPE_LABEL[post.type] ?? post.type}
          {post.publishAt ? ` · ${dayjs(post.publishAt).format("D MMM YYYY")}` : ""}
        </div>
        <h1 className={styles.contentTitle}>{post.title}</h1>
        <div className={styles.contentBody}>{post.body}</div>
      </article>
    </div>
  );
}
