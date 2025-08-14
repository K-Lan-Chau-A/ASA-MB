export type RootStackParamList = {
  Login: undefined;
  MainApp: undefined;
  Notification: undefined;
  Scanner: undefined;
  ChatbotScreen: undefined;
  Order: { 
    scannedProduct?: { barcode: string; type?: string };
    newProduct?: { id: string; name: string; price: number; barcode: string };
    scanTimestamp?: number;
  } | undefined;
  AddProduct: { barcode?: string } | undefined;
};

export type TabParamList = {
  TrangChu: undefined;
  HoaDon: undefined;
  LenDon: undefined;
  HangHoa: undefined;
  NhieuHon: undefined;
};
