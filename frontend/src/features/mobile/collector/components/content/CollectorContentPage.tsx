"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import * as SharedApi from "../../shared/query";
import { CONTENT_TYPE_LABEL } from "../../support/constants";
import styles from "../support/support.module.css";

export default function CollectorContentPage() {
  const listQuery = useQuery({
    queryKey: mobileQueryKey("collector", ["content"]),
    queryFn: () => SharedApi.listCollectorContent({ page: 1, limit: 50 }),
  });

  const posts = listQuery.data?.data ?? [];

  return (
    <div className={styles.page}>
      <p className={styles.pageIntro}>Collector guides, policies, and operational notices.</p>

      {listQuery.isLoading ? (
        <div className={styles.loadingWrap}>
          <Spin />
          <span>Loading content…</span>
        </div>
      ) : listQuery.isError ? (
        <div className={styles.errorWrap}>Could not load guides and policies.</div>
      ) : posts.length === 0 ? (
        <div className={styles.emptyWrap}>
          <strong>No published content</strong>
          <span>Check back later for collector guides and policies.</span>
        </div>
      ) : (
        <div className={styles.cardList}>
          {posts.map((post) => (
            <Link key={post.id} href={`/collector/content/${post.id}`} className={styles.contentCard}>
              {post.isPinned ? <span className={styles.pinnedBadge}>Pinned</span> : null}
              <div className={styles.cardMeta}>
                {CONTENT_TYPE_LABEL[post.type] ?? post.type}
                {post.publishAt ? ` · ${dayjs(post.publishAt).format("D MMM YYYY")}` : ""}
              </div>
              <h3 className={styles.contentTitle}>{post.title}</h3>
              <p className={styles.contentExcerpt}>{post.body}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
