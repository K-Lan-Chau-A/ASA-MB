export type RootStackParamList = {
  Login: undefined;
  MainApp: { orderCompleted?: boolean } | undefined;
  Notification: undefined;
  Scanner: undefined;
  ChatbotScreen: undefined;
  Order: { 
    scannedProduct?: { barcode: string; type?: string };
    newProduct?: { id: string; name: string; price: number; barcode: string };
    scanTimestamp?: number;
    orderCompleted?: boolean;
  } | undefined;
  AddProduct: { barcode?: string } | undefined;
  ConfirmOrder: {
    products: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
      barcode?: string;
      units: Array<{
        unitName: string;
        price: number;
        quantityInBaseUnit: number;
        isBaseUnit: boolean;
      }>;
      selectedUnit: string;
    }>;
    totalAmount: number;
  };
  InvoicePreview: {
    invoiceData: {
      invoiceNumber: string;
      date: string;
      time: string;
      paymentMethod: string;
      totalAmount: number;
      products: Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
        selectedUnit: string;
      }>;
      discount: number;
    };
  };
};

export type TabParamList = {
  TrangChu: undefined;
  HoaDon: undefined;
  LenDon: undefined;
  HangHoa: undefined;
  NhieuHon: undefined;
};
