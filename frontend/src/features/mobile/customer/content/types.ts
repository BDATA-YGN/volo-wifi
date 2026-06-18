export type MobileContentPost = {
  id: string;
  type: string;
  title: string;
  body: string;
  audience: string;
  isPinned: boolean;
  publishAt: string | null;
  expireAt: string | null;
  createdAt: string | null;
};

export type ContentTypeFilter = "all" | "NOTICE" | "GUIDE" | "POLICY";
