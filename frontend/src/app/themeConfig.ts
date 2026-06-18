import { theme, ThemeConfig } from "antd";

export const lightTheme: ThemeConfig = {
  algorithm: [theme.defaultAlgorithm, theme.compactAlgorithm], // Light Mode
  token: {
    colorPrimary: "#2f54eb",
    colorInfo: "#2f54eb",
    borderRadius: 3,
  },
  components: {
    Layout: {
      bodyBg: "rgb(244, 247, 254)",
      siderBg: "rgb(255, 255, 255)",
      headerBg: "rgb(246, 248, 249)",
      footerBg: "rgb(244, 247, 254)"
    },
    Menu: {
      subMenuItemBg: "rgba(0, 0, 0, 0)",
      colorPrimary: "rgb(0, 0, 0)",
      colorText: "rgb(0, 0, 0)",
      itemSelectedBg: "#131629",
      itemSelectedColor: "#FFFFFF"
    }
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: [theme.darkAlgorithm, theme.compactAlgorithm], // Dark Mode
  token: {
    colorPrimary: "#2f54eb",
    colorInfo: "#2f54eb",
    colorBgContainer: "#1f252742",
    colorBgLayout: "#313541",
    borderRadius: 3
  },
  components: {
    Layout: {
      bodyBg: "rgb(20, 20, 20)",
      siderBg: "rgb(49, 53, 65)",
      headerBg: "rgb(49, 53, 65)",
      footerBg: "rgb(20, 20, 20)"
    },
    Menu: {
      subMenuItemBg: "rgba(0, 0, 0, 0)",
      itemBg: "rgba(255, 255, 255, 0)",
      colorPrimary: "rgb(246, 246, 252)",
      colorText: "rgba(207, 210, 225, 0.85)"
    }
  },
};
