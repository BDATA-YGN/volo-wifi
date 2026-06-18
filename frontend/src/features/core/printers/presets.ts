const PRESETS: any = {
  POS44: {
    width: 44,
    height: 297, // Standard thermal roll length (variable, but using A5 height as a reference)
    printBackground: true,
    dpi: { horizontal: 180, vertical: 180 }
  },
  POS57: {
    width: 57,
    height: 297,
    printBackground: true,
    dpi: { horizontal: 180, vertical: 180 }
  },
  POS58: {
    width: 58,
    height: 297,
    printBackground: true,
    dpi: { horizontal: 180, vertical: 180 }
  },
  POS76: {
    width: 76,
    height: 297,
    printBackground: true,
    dpi: { horizontal: 180, vertical: 180 }
  },
  POS78: {
    width: 78,
    height: 297,
    printBackground: true,
    dpi: { horizontal: 180, vertical: 180 }
  },
  POS80: {
    width: 80,
    height: 297,
    printBackground: true,
    dpi: { horizontal: 180, vertical: 180 }
  },
  A4: {
    width: 210,
    height: 297,
    printBackground: true,
    dpi: { horizontal: 300, vertical: 300 }
  },
  A5: {
    width: 148,
    height: 210,
    printBackground: true,
    dpi: { horizontal: 300, vertical: 300 }
  },
  LABEL50x30: {
    width: 50,
    height: 30,
    printBackground: true,
    dpi: { horizontal: 203, vertical: 203 }
  },
  LABEL100x150: {
    width: 100,
    height: 150,
    printBackground: true,
    dpi: { horizontal: 300, vertical: 300 }
  }
};

export default PRESETS;