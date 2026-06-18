export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  categoryId: number;
  coverImages: string[];
  audioFileId?: number;
  attachedFiles: string[];
  publishedAt: Date | string;
  city?: string;
  cityId?: number;
  tags: number[];
  status: "draft" | "pending" | "scheduled" | "published" | "archived";
  reporterId?: string;
  authorId?: string;
  viewCount?: number;
  activityId?: number;
  announcementId?: number;
  approvedById?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  
  // Relationships
  category?: Category;
  cityPlace?: Place;
  reporter?: Admin;
  author?: Admin;
  activity?: Activity;
  announcement?: Announcement;
  approvedBy?: Admin;
  tagsRelation?: PastActivityTag[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  imageUrl?: number;
  total?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Tag {
  id: number;
  name: string;
  totalUsage: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Author {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface Admin {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  profileImage?: string;
  phoneNumber?: string;
  isActive: boolean;
  isSuper: boolean;
  isVerified: boolean;
  isBlocked: boolean;
  isOnline: boolean;
  lastLogin?: Date;
  lastIp?: string;
  joinDate: Date;
  reporterCode: string;
  employmentType: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface Place {
  id: number;
  country: string;
  state?: string;
  district?: string;
  city?: string;
  quarter?: string;
  village?: string;
  street?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Activity {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  participants: string;
  icon: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Announcement {
  id: number;
  title: string;
  date: string;
  summary: string;
  details: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface PastActivityTag {
  id: string;
  pastActivityId: string;
  tagId: number;
  createdAt: Date;
  tag?: Tag;
}

export interface FileLog {
  id: string;
  fileName: string;
  filename: string; // for compatibility
  url: string;
  type: string;
  size: number;
  mimeType: string;
  mimetype: string; // for compatibility
  category?: string;
  bucket?: string;
  folder?: string;
  isFolder: boolean;
  parentId?: string;
  path?: string;
  lastModified?: Date | string;
  authorId?: string;
  isPublic?: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface FileUpload {
  id: number;
  filename: string;
  url: string;
  type: string;
  size: number;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  requirements: string;
  location: string;
  type: string;
  postedAt: Date;
  deadline: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface RadioEN {
  id: number;
  title: string;
  description: string;
  audiofile: string;
  postDate: Date;
  status: string;
  authorId: number;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface RadioMM {
  id: number;
  title: string;
  description: string;
  audiofile: string;
  postDate: Date;
  status: string;
  authorId: number;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface AudioFile {
  id: number;
  filename: string;
  url: string;
  duration: number;
  size: number;
  type: string;
}

export interface Feedback {
  id: number;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Subscriber {
  id: number;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface YouTubeVideo {
  id: number;
  videoId: string;
  title: string;
  description?: string;
  publishedAt: Date;
  isVideo?: boolean;
  status?: string;
  thumbnail?: string;
  viewCount: number;
  authorId?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface BreakingNews {
  id: number;
  title: string;
  summary: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Advertisement {
  id: number;
  title: string;
  description?: string;
  type: "banner" | "popup";
  position: "header" | "sidebar" | "footer" | "content" | "popup-center" | "popup-corner";
  size: "small" | "medium" | "large" | "custom";
  customWidth?: number;
  customHeight?: number;
  imageUrl?: string;
  clickUrl: string;
  targetBlank: boolean;
  status: "draft" | "active" | "paused" | "expired";
  priority: number;
  startDate: Date;
  endDate?: Date;
  dailyBudget?: number;
  totalBudget?: number;
  costPerClick?: number;
  costPerImpression?: number;
  targetAudience?: string[];
  targetPages?: string[];
  showFrequency: number; // minutes between shows for same user
  maxDailyShows?: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  paymentStatus: "pending" | "paid" | "overdue";
  totalClicks: number;
  totalImpressions: number;
  totalRevenue: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface AdCampaign {
  id: number;
  name: string;
  description?: string;
  clientName: string;
  clientEmail: string;
  status: "draft" | "active" | "paused" | "completed";
  startDate: Date;
  endDate?: Date;
  totalBudget: number;
  spentBudget: number;
  advertisements: number[]; // Ad IDs
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface AdAnalytics {
  id: number;
  advertisementId: number;
  date: Date;
  impressions: number;
  clicks: number;
  revenue: number;
  ctr: number; // Click-through rate
  cpm: number; // Cost per mille
  cpc: number; // Cost per click
  createdAt: Date;
}
