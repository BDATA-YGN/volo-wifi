"use client";

import { CarryOutOutlined, ClockCircleFilled, DeleteOutlined, EyeOutlined, LeftOutlined, PlusOutlined, RightOutlined, SaveOutlined } from "@ant-design/icons";
import React from "react";
import { FaCalendarAlt, FaChartArea, FaComments, FaFilm, FaHome, FaShoppingCart, FaStar, FaTheaterMasks, FaTicketAlt, FaTv, FaUsb, FaUser, FaUserInjured, FaUserNurse, FaVideo } from "react-icons/fa";
import { FaRegClock, FaRegCopy, FaRegFile, FaVolumeXmark } from "react-icons/fa6";
import { IoMdNotifications, IoMdPersonAdd, IoMdPricetags, IoMdStats, IoMdTrendingUp } from "react-icons/io";
import { IoSettingsSharp } from "react-icons/io5";
import { SiMarko, SiSpeedtest } from "react-icons/si";
import { AiOutlineFileSearch } from "react-icons/ai";
import { RiExpandHeightFill, RiExpandWidthFill } from "react-icons/ri";
import { TbBoxMargin } from "react-icons/tb";
import {
  BiAbacus,
  BiAccessibility,
  BiAdjust,
  BiAlarm,
  BiAnalyse,
  BiArchive,
  BiAward,
  BiBadge,
  BiBarChart,
  BiBarcode,
  BiBell,
  BiBook,
  BiBookmark,
  BiBriefcase,
  BiBrush,
  BiBug,
  BiBuilding,
  BiBus,
  BiCalculator,
  BiCalendarCheck,
  BiCamera,
  BiCameraMovie,
  BiCar,
  BiCategory,
  BiChat,
  BiCloud,
  BiCog,
  BiCopy,
  BiCreditCard,
  BiDesktop,
  BiDetail,
  BiDish,
  BiDollar,
  BiDotsHorizontalRounded,
  BiDownload,
  BiEdit,
  BiEnvelope,
  BiError,
  BiFile,
  BiFileBlank,
  BiFilter,
  BiFingerprint,
  BiFlag,
  BiFolder,
  BiFolderOpen,
  BiFoodMenu,
  BiGlobe,
  BiGridAlt,
  BiGroup,
  BiHash,
  BiHeart,
  BiHelpCircle,
  BiHistory,
  BiIdCard,
  BiImage,
  BiInfoCircle,
  BiKey,
  BiLabel,
  BiLink,
  BiListUl,
  BiLock,
  BiLogIn,
  BiLogOut,
  BiMailSend,
  BiMap,
  BiMenu,
  BiMessage,
  BiMinus,
  BiMobile,
  BiMoon,
  BiMusic,
  BiPackage,
  BiPaperclip,
  BiPen,
  BiPhone,
  BiPieChart,
  BiPin,
  BiPowerOff,
  BiPrinter,
  BiQr,
  BiReceipt,
  BiRefresh,
  BiSearch,
  BiShield,
  BiShoppingBag,
  BiShow,
  BiSmile,
  BiSolidDashboard,
  BiSolidPrinter,
  BiSolidUserAccount,
  BiStore,
  BiSun,
  BiTable,
  BiTag,
  BiTargetLock,
  BiTrash,
  BiUpload,
  BiUser,
  BiWallet,
  BiWifi,
  BiWrench,
  BiX,
  BiXCircle,
  BiZoomIn
} from "react-icons/bi";
import keywordSynonyms from "./keywordSynonyms";

type IconComponent = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

interface IconOption {
  value: string;
  keywords: string[];
}

const iconRegistry: Record<string, IconComponent> = {
  abacus: BiAbacus,
  accessibility: BiAccessibility,
  action: BiDotsHorizontalRounded,
  addperson: IoMdPersonAdd,
  adjust: BiAdjust,
  aioutlinefilesearch: AiOutlineFileSearch,
  alarm: BiAlarm,
  analysis: BiAnalyse,
  archive: BiArchive,
  award: BiAward,
  badge: BiBadge,
  badgecheck: BiBadge,
  barcode: BiBarcode,
  bell: BiBell,
  book: BiBook,
  bookmark: BiBookmark,
  briefcase: BiBriefcase,
  brush: BiBrush,
  bug: BiBug,
  building: BiBuilding,
  buildings: BiBuilding,
  bus: BiBus,
  calculator: BiCalculator,
  calendar: FaCalendarAlt,
  calendarcheck: BiCalendarCheck,
  checkcircle: BiCalendarCheck,
  camera: BiCamera,
  cameramovie: BiCameraMovie,
  car: BiCar,
  carry: CarryOutOutlined,
  cart: FaShoppingCart,
  category: BiCategory,
  chart: FaChartArea,
  barchart: BiBarChart,
  chat: BiChat,
  chip: BiPackage,
  "clock-circle": ClockCircleFilled,
  clockcircle: ClockCircleFilled,
  cloud: BiCloud,
  cog: BiCog,
  comments: FaComments,
  copy: BiCopy,
  dashboard: BiSolidDashboard,
  database: BiTable,
  delete: DeleteOutlined,
  desktop: BiDesktop,
  server: BiDesktop,
  detail: BiDetail,
  dish: BiDish,
  dollar: BiDollar,
  money: BiDollar,
  download: BiDownload,
  edit: BiEdit,
  email: BiEnvelope,
  envelope: BiEnvelope,
  error: BiError,
  warning: BiError,
  eye: EyeOutlined,
  faregclock: FaRegClock,
  faregcopy: FaRegCopy,
  faregfile: FaRegFile,
  fausb: FaUsb,
  favolumexmark: FaVolumeXmark,
  file: BiFile,
  "file-blank": BiFileBlank,
  film: FaFilm,
  filter: BiFilter,
  fingerprint: BiFingerprint,
  flag: BiFlag,
  folder: BiFolder,
  folderopen: BiFolderOpen,
  foodmenu: BiFoodMenu,
  gear: BiCog,
  genre: BiCategory,
  globe: BiGlobe,
  planet: BiGlobe,
  grid: BiGridAlt,
  group: BiGroup,
  hash: BiHash,
  heart: BiHeart,
  helpcircle: BiHelpCircle,
  history: BiHistory,
  home: FaHome,
  id: BiIdCard,
  idcard: BiIdCard,
  image: BiImage,
  info: BiInfoCircle,
  iossettingssharp: IoSettingsSharp,
  key: BiKey,
  label: BiLabel,
  left: LeftOutlined,
  link: BiLink,
  list: BiListUl,
  lock: BiLock,
  "log-in": BiLogIn,
  "log-out": BiLogOut,
  mail: BiMailSend,
  map: BiMap,
  marketing: SiMarko,
  menu: BiMenu,
  message: BiMessage,
  minus: BiMinus,
  mobile: BiMobile,
  moon: BiMoon,
  movie: BiCameraMovie,
  music: BiMusic,
  notification: IoMdNotifications,
  off: BiPowerOff,
  package: BiPackage,
  paperclip: BiPaperclip,
  password: BiLock,
  payment: BiCreditCard,
  payments: BiCreditCard,
  pen: BiPen,
  phone: BiPhone,
  piechart: BiPieChart,
  pin: BiPin,
  plus: PlusOutlined,
  "price-tag": IoMdPricetags,
  printer: BiPrinter,
  qr: BiQr,
  receipt: BiReceipt,
  refresh: BiRefresh,
  report: BiBarChart,
  review: BiShow,
  riexpandheightfill: RiExpandHeightFill,
  riexpandwidthfill: RiExpandWidthFill,
  right: RightOutlined,
  save: SaveOutlined,
  search: BiSearch,
  series: FaTv,
  settings: BiCog,
  shield: BiShield,
  "shopping-bag": BiShoppingBag,
  show: BiShow,
  sispeedtest: SiSpeedtest,
  smile: BiSmile,
  soliddashboard: BiSolidDashboard,
  solidprinter: BiSolidPrinter,
  soliduseraccount: BiSolidUserAccount,
  star: FaStar,
  stats: IoMdStats,
  store: BiStore,
  sun: BiSun,
  table: BiTable,
  tag: BiTag,
  target: BiTargetLock,
  tbboxmargin: TbBoxMargin,
  theater: FaTheaterMasks,
  ticket: FaTicketAlt,
  trash: BiTrash,
  trending: IoMdTrendingUp,
  truck: BiBus,
  tv: FaTv,
  upload: BiUpload,
  url: BiLink,
  user: FaUser,
  "user-injured": FaUserInjured,
  "user-nurse": FaUserNurse,
  username: BiUser,
  users: BiGroup,
  video: FaVideo,
  wallet: BiWallet,
  wifi: BiWifi,
  wrench: BiWrench,
  x: BiX,
  "zoom-in": BiZoomIn,
};

type Name = keyof typeof iconRegistry;

interface TheIconProps {
  name: Name;
  className?: string;
  style?: React.CSSProperties;
}

function generateKeywords(iconName: string): string[] {
  const words = iconName
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .split(/[-_]/)
    .filter((word) => word);

  const keywords = new Set<string>(words);
  words.forEach((word) => {
    if (keywordSynonyms[word]) {
      keywordSynonyms[word].forEach((synonym) => keywords.add(synonym));
    }
  });

  return Array.from(keywords);
}

function TheIcon({ name, className = "inline", style }: TheIconProps) {
  const IconComponent = iconRegistry[name];

  if (!IconComponent) {
    return <BiXCircle className={className} />;
  }

  return <IconComponent className={className} style={style} />;
}

const iconOptions: IconOption[] = Object.keys(iconRegistry).map((name) => ({
  value: name,
  keywords: generateKeywords(name),
}));

export default TheIcon;
export { iconOptions };
export type { Name };
