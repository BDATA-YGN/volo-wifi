import { Theme } from './types';
import { ThemeConfig, theme } from 'antd';

const defaultLightTheme: ThemeConfig = {
  algorithm: [theme.defaultAlgorithm, theme.compactAlgorithm],
  token: {
    colorPrimary: "#003176",
    colorInfo: "#003176",
    colorSuccess: "#50e903",
    colorWarning: "#291c01",
    colorError: "#190708",
    colorLink: "#406faf",
    fontSize: 12,
    sizeStep: 4,
    sizeUnit: 3,
    borderRadius: 1
  },
  components: {
    Button: {
      borderColorDisabled: "rgb(239,8,8)"
    },
    Breadcrumb: {
      itemColor: "rgb(82,196,26)",
      lastItemColor: "rgb(245,34,45)"
    }
  }
};

const defaultDarkTheme: ThemeConfig = {
  algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
  token: {
    colorPrimary: "#003176",
    colorInfo: "#003176",
    colorSuccess: "#50e903",
    colorWarning: "#291c01",
    colorError: "#190708",
    colorLink: "#406faf",
    fontSize: 12,
    sizeStep: 4,
    sizeUnit: 3,
    borderRadius: 1
  },
  components: {
    Button: {
      borderColorDisabled: "rgb(239,8,8)"
    },
    Breadcrumb: {
      itemColor: "rgb(82,196,26)",
      lastItemColor: "rgb(245,34,45)"
    }
  }
};

export const blueThemeLT: ThemeConfig = {
  algorithm: [theme.defaultAlgorithm, theme.compactAlgorithm],
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

export const blueThemeDT: ThemeConfig = {
  algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
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

export const mockThemes: Theme[] = [
  {
    id: "1",
    name: "Default Theme",
    lightTheme: defaultLightTheme,
    darkTheme: defaultDarkTheme,
    isDefault: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    deletedAt: null
  },
  {
    id: "2",
    name: "Blue Theme",
    lightTheme: blueThemeLT,
    darkTheme: blueThemeDT,
    isDefault: false,
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    deletedAt: null
  }
];