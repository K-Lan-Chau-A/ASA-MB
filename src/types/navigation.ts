export type RootStackParamList = {
  Login: undefined;
  MainApp: undefined;
  Notification: undefined;
  Scanner: undefined;
  Order: { scannedProduct?: { barcode: string; type?: string } } | undefined;
};

export type TabParamList = {
  TrangChu: undefined;
  HoaDon: undefined;
  LenDon: undefined;
  HangHoa: undefined;
  NhieuHon: undefined;
};
