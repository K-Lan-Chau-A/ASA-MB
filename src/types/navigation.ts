export type RootStackParamList = {
  Login: undefined;
  MainApp: { orderCompleted?: boolean } | undefined;
  Notification: undefined;
  Scanner: undefined;
  ChatbotScreen: undefined;
  PromotionScreen: undefined;
  VoucherScreen: undefined;
  InventoryTransactionScreen: undefined;
  ManageCustomerScreen: undefined;
  ManageCategoryScreen: undefined;
  LogActivityScreen: undefined;
  ManageAccount: undefined;
  RankScreen: undefined;
  ReportScreen: undefined;
  SettingScreen: undefined;
  OrderDetail: { orderId: number };
  Customer: undefined;
  Order: { 
    scannedProduct?: { barcode: string; type?: string };
    newProduct?: { id: string; name: string; price: number; barcode: string };
    scanTimestamp?: number;
    customer?: { id: number; fullName: string; phone?: string; email?: string };
    orderCompleted?: boolean;
  } | undefined;
  AddProduct: { barcode?: string; product?: any } | undefined;
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
    customerId?: number | null;
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
