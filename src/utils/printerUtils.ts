import AsyncStorage from '@react-native-async-storage/async-storage';

const PRINTER_IP_KEY = 'printer:ip';
const PRINTER_PORT = 9100; // Default ESC/POS port

// Helper to create Uint8Array from string (React Native compatible)
const stringToUint8Array = (str: string, encoding: 'utf8' | 'latin1' = 'utf8'): Uint8Array => {
  if (encoding === 'latin1') {
    // Latin1: each character is 1 byte
    const arr = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      arr[i] = str.charCodeAt(i);
    }
    return arr;
  } else {
    // UTF-8: use TextEncoder
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }
};

// Helper to convert Uint8Array to Buffer if Buffer is available (for TCP socket)
const toBuffer = (data: Uint8Array): any => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(data);
  }
  return data;
};

// Get printer IP from AsyncStorage
export const getPrinterIp = async (): Promise<string | null> => {
  try {
    const ip = await AsyncStorage.getItem(PRINTER_IP_KEY);
    return ip || null;
  } catch (error) {
    console.error('Error getting printer IP:', error);
    return null;
  }
};

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';

// Initialize printer
const init = () => ESC + '@';

// Text alignment
const alignLeft = () => ESC + 'a' + '\x00';
const alignCenter = () => ESC + 'a' + '\x01';
const alignRight = () => ESC + 'a' + '\x02';

// Text styles
const boldOn = () => ESC + 'E' + '\x01';
const boldOff = () => ESC + 'E' + '\x00';

// Font size
const setFontSize = (width: number = 1, height: number = 1) => {
  const size = (width - 1) << 4 | (height - 1);
  return ESC + '!' + String.fromCharCode(size);
};

// Line feed
const lineFeed = (n: number = 1) => '\x0A'.repeat(n);

// Cut paper
const cut = () => GS + 'V' + '\x41' + '\x03';

// Set character code page for Vietnamese support
// Code page 16 = Windows-1258 (Vietnamese) - matches CP1258 encoding
// Code page 19 = CP858 (Euro)
// Some printers may need different code pages depending on firmware
const setCodePage = (page: number = 16) => {
  return ESC + '\x74' + String.fromCharCode(page);
};

// Remove Vietnamese accents/diacritics to avoid encoding issues
// Converts: á → a, ố → o, đ → d, etc.
const removeVietnameseAccents = (text: string): string => {
  if (!text) return '';
  
  // Map Vietnamese characters to ASCII equivalents
  const accentMap: { [key: string]: string } = {
    // Lowercase
    'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
    'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
    'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
    'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    'đ': 'd',
    // Uppercase
    'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
    'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
    'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
    'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
    'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
    'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
    'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
    'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
    'Đ': 'D',
    // Special cases
    'ă': 'a', 'Ă': 'A',
    'â': 'a', 'Â': 'A',
    'ê': 'e', 'Ê': 'E',
    'ô': 'o', 'Ô': 'O',
    'ơ': 'o', 'Ơ': 'O',
    'ư': 'u', 'Ư': 'U',
  };
  
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += accentMap[char] || char;
  }
  
  return result;
};

// Convert Vietnamese text to ASCII (no accents) for reliable printing
// This ensures no encoding issues - all text becomes ASCII compatible
const encodeVietnamese = (text: string): Uint8Array => {
  if (!text) {
    return new Uint8Array(0);
  }
  
  // Remove Vietnamese accents to avoid encoding issues
  const noAccentText = removeVietnameseAccents(text);
  
  // Convert to Uint8Array using Latin1 encoding (pure ASCII compatible)
  // Latin1 treats each char as one byte, perfect for ASCII-only text
  return stringToUint8Array(noAccentText, 'latin1');
};

// Format currency - returns with 'd' instead of 'đ' (no accent)
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('vi-VN') + 'd';
};

// Helper to append string (for ESC/POS commands) or Uint8Array (for encoded text) to data buffer
const appendToBuffer = (buffers: Uint8Array[], data: string | Uint8Array): void => {
  if (typeof data === 'string') {
    // ESC/POS commands are single-byte, use latin1 encoding
    buffers.push(stringToUint8Array(data, 'latin1'));
  } else {
    // Already Uint8Array
    buffers.push(data);
  }
};

// Create ESC/POS receipt
export const generateReceiptData = (invoiceData: {
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
  shopName?: string;
  shopAddress?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}, copyCount: number = 1): Uint8Array => {
  const buffers: Uint8Array[] = [];
  
  // Initialize printer
  appendToBuffer(buffers, init());
  
  // Number to words helper function
  const numberToWords = (num: number): string => {
    const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
    
    if (num === 0) return 'không';
    if (num < 10) return ones[num];
    if (num < 100) {
      const ten = Math.floor(num / 10);
      const one = num % 10;
      if (ten === 1) return one === 0 ? 'mười' : `mười ${ones[one]}`;
      return one === 0 ? tens[ten] : `${tens[ten]} ${ones[one]}`;
    }
    if (num < 1000) {
      const hundred = Math.floor(num / 100);
      const remainder = num % 100;
      const hundredStr = hundred === 1 ? 'một trăm' : `${ones[hundred]} trăm`;
      if (remainder === 0) return hundredStr;
      return `${hundredStr} ${numberToWords(remainder)}`;
    }
    if (num < 1000000) {
      const thousand = Math.floor(num / 1000);
      const remainder = num % 1000;
      if (remainder === 0) return `${numberToWords(thousand)} nghìn`;
      return `${numberToWords(thousand)} nghìn ${numberToWords(remainder)}`;
    }
    return 'số quá lớn';
  };

  // Print multiple copies
  for (let copy = 0; copy < copyCount; copy++) {
    // Store information - match InvoicePreviewScreen layout
    appendToBuffer(buffers, alignCenter());
    appendToBuffer(buffers, boldOn());
    appendToBuffer(buffers, setFontSize(2, 2));
    appendToBuffer(buffers, encodeVietnamese(invoiceData.shopName || 'CỬA HÀNG'));
    appendToBuffer(buffers, '\n');
    appendToBuffer(buffers, boldOff());
    appendToBuffer(buffers, setFontSize(1, 1));
    
    if (invoiceData.shopAddress) {
      appendToBuffer(buffers, encodeVietnamese('Địa chỉ: ' + invoiceData.shopAddress));
      appendToBuffer(buffers, '\n');
    }
    appendToBuffer(buffers, lineFeed(1));
    
    // Invoice header - match InvoicePreviewScreen
    appendToBuffer(buffers, alignCenter());
    appendToBuffer(buffers, boldOn());
    appendToBuffer(buffers, encodeVietnamese('HÓA ĐƠN BÁN HÀNG'));
    appendToBuffer(buffers, '\n');
    appendToBuffer(buffers, boldOff());
    appendToBuffer(buffers, encodeVietnamese('SỐ HĐ: ' + invoiceData.invoiceNumber));
    appendToBuffer(buffers, '\n');
    if (invoiceData.time) {
      appendToBuffer(buffers, encodeVietnamese(invoiceData.time + ' - ngày ' + invoiceData.date));
    } else {
      appendToBuffer(buffers, encodeVietnamese('ngày ' + invoiceData.date));
    }
    appendToBuffer(buffers, '\n');
    appendToBuffer(buffers, lineFeed(1));
    
    // Customer information - match InvoicePreviewScreen
    appendToBuffer(buffers, alignLeft());
    appendToBuffer(buffers, encodeVietnamese('Khách hàng: ' + (invoiceData.customerName || 'Khách lẻ')));
    appendToBuffer(buffers, '\n');
    if (invoiceData.customerPhone) {
      appendToBuffer(buffers, encodeVietnamese('SDT: ' + invoiceData.customerPhone));
    } else {
      appendToBuffer(buffers, encodeVietnamese('SDT: '));
    }
    appendToBuffer(buffers, '\n');
    if (invoiceData.customerEmail) {
      appendToBuffer(buffers, encodeVietnamese('Email: ' + invoiceData.customerEmail));
    } else {
      appendToBuffer(buffers, encodeVietnamese('Email: '));
    }
    appendToBuffer(buffers, '\n');
    // Payment method
    appendToBuffer(buffers, encodeVietnamese('Phuong thuc thanh toan: ' + (invoiceData.paymentMethod || 'Tien mat')));
    appendToBuffer(buffers, '\n');
    appendToBuffer(buffers, lineFeed(1));
    
    // Divider - full width (48 chars)
    appendToBuffer(buffers, '-'.repeat(48) + '\n');
    
    // Fixed-width column system (thermal printer width: 48 chars)
    const COL1_WIDTH = 22; // Product name column
    const COL2_WIDTH = 8;  // "SL" column  
    const COL3_WIDTH = 18; // "Thanh tien" column
    // Total: 22 + 8 + 18 = 48 chars
    
    // Products header
    appendToBuffer(buffers, alignLeft());
    // Build header: "Don gia" (left COL1) + "SL" (center COL2) + "Thanh tien" (right COL3)
    let headerLine = 'Don gia'.padEnd(COL1_WIDTH);
    // Center "SL" in COL2
    const slPadding = Math.floor((COL2_WIDTH - 2) / 2);
    headerLine += ' '.repeat(slPadding) + 'SL' + ' '.repeat(COL2_WIDTH - 2 - slPadding);
    // Right align "Thanh tien" in COL3
    headerLine += 'Thanh tien'.padStart(COL3_WIDTH);
    appendToBuffer(buffers, encodeVietnamese(headerLine));
    appendToBuffer(buffers, '\n');
    
    // Divider below header - full width
    appendToBuffer(buffers, '-'.repeat(48) + '\n');
    appendToBuffer(buffers, lineFeed(1));
    
    // Products - name, SL, and total on same line
    invoiceData.products.forEach((product, index) => {
      const name = product.name;
      const pricePerUnit = formatCurrency(product.price);
      const unit = product.selectedUnit;
      const qty = product.quantity.toString();
      const total = formatCurrency(product.price * product.quantity);
      
      // Line 1: Product name, SL, and total - all on same line, aligned with header
      let productLine = '';
      // Product name in COL1 (truncate if too long)
      const nameDisplay = name.length > COL1_WIDTH ? name.substring(0, COL1_WIDTH - 3) + '...' : name;
      productLine += nameDisplay.padEnd(COL1_WIDTH);
      
      // Center quantity in COL2 (same as "SL")
      const qtyPadding = Math.floor((COL2_WIDTH - qty.length) / 2);
      productLine += ' '.repeat(qtyPadding) + qty + ' '.repeat(COL2_WIDTH - qty.length - qtyPadding);
      
      // Right align total in COL3 (same as "Thanh tien")
      productLine += total.padStart(COL3_WIDTH);
      
      appendToBuffer(buffers, encodeVietnamese(productLine));
      appendToBuffer(buffers, '\n');
      
      // Line 2: Price per unit (indented, optional info)
      appendToBuffer(buffers, '  ');
      appendToBuffer(buffers, encodeVietnamese(pricePerUnit + ' / ' + unit));
      appendToBuffer(buffers, '\n');
      
      // Divider between products - full width
      if (index < invoiceData.products.length - 1) {
        appendToBuffer(buffers, '-'.repeat(48));
        appendToBuffer(buffers, '\n');
        appendToBuffer(buffers, lineFeed(1));
      }
    });
    
    appendToBuffer(buffers, lineFeed(1));
    
    // Divider before summary - full width
    appendToBuffer(buffers, '-'.repeat(48) + '\n');
    
    // Summary - values aligned to COL3 (right)
    appendToBuffer(buffers, alignLeft());
    const totalBeforeDiscount = invoiceData.totalAmount + invoiceData.discount;
    
    const label1 = 'Tong tien hang:';
    const value1 = formatCurrency(totalBeforeDiscount);
    const summaryLine1 = label1 + ' '.repeat(COL1_WIDTH + COL2_WIDTH - label1.length) + value1.padStart(COL3_WIDTH);
    appendToBuffer(buffers, encodeVietnamese(summaryLine1));
    appendToBuffer(buffers, '\n');
    
    const discountPercent = invoiceData.discount > 0 
      ? Math.round((invoiceData.discount / totalBeforeDiscount) * 100) 
      : 0;
    const label2 = 'Chiet khau ' + discountPercent + '%:';
    const value2 = formatCurrency(invoiceData.discount);
    const summaryLine2 = label2 + ' '.repeat(COL1_WIDTH + COL2_WIDTH - label2.length) + value2.padStart(COL3_WIDTH);
    appendToBuffer(buffers, encodeVietnamese(summaryLine2));
    appendToBuffer(buffers, '\n');
    
    appendToBuffer(buffers, boldOn());
    const label3 = 'Tong thanh toan:';
    const value3 = formatCurrency(invoiceData.totalAmount);
    const summaryLine3 = label3 + ' '.repeat(COL1_WIDTH + COL2_WIDTH - label3.length) + value3.padStart(COL3_WIDTH);
    appendToBuffer(buffers, encodeVietnamese(summaryLine3));
    appendToBuffer(buffers, '\n');
    appendToBuffer(buffers, boldOff());
    
    const totalWords = numberToWords(invoiceData.totalAmount);
    appendToBuffer(buffers, alignCenter());
    appendToBuffer(buffers, encodeVietnamese(`(${totalWords} đồng chẵn)`));
    appendToBuffer(buffers, '\n');
    
    appendToBuffer(buffers, lineFeed(2));
    appendToBuffer(buffers, alignCenter());
    appendToBuffer(buffers, encodeVietnamese('Cảm ơn và hẹn gặp lại!'));
    appendToBuffer(buffers, '\n');
    
    // Add separator between copies
    if (copy < copyCount - 1) {
      appendToBuffer(buffers, lineFeed(3));
      appendToBuffer(buffers, alignCenter());
      appendToBuffer(buffers, encodeVietnamese('--- Bản sao ' + (copy + 2) + ' ---'));
      appendToBuffer(buffers, '\n');
      appendToBuffer(buffers, lineFeed(2));
    }
  }
  
  // Cut paper
  appendToBuffer(buffers, lineFeed(3));
  appendToBuffer(buffers, cut());
  
  // Concatenate all Uint8Arrays into a single array
  // Calculate total length
  let totalLength = 0;
  for (const buf of buffers) {
    totalLength += buf.length;
  }
  
  // Create result array and copy data
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(buf, offset);
    offset += buf.length;
  }
  
  return result;
};

// Try to use TCP socket library if available
let TcpSocket: any = null;
try {
  TcpSocket = require('react-native-tcp-socket');
} catch {
  // Library not installed
}

// Track active print requests to prevent concurrent connections
let isPrinting = false;

// Send print job to printer via TCP/IP
export const printReceipt = async (
  receiptData: Uint8Array,
  printerIp: string,
  port: number = PRINTER_PORT
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Prevent concurrent print requests
    if (isPrinting) {
      return {
        success: false,
        error: 'Đang xử lý lệnh in trước đó. Vui lòng đợi...',
      };
    }

    // Validate IP and port
    if (!printerIp || !printerIp.trim()) {
      return {
        success: false,
        error: 'Địa chỉ IP máy in không hợp lệ.',
      };
    }
    
    if (!port || port <= 0 || port > 65535) {
      return {
        success: false,
        error: 'Cổng máy in không hợp lệ.',
      };
    }
    
    // If TCP socket library is available, use it
    if (TcpSocket && TcpSocket.Socket) {
      return new Promise((resolve) => {
        isPrinting = true;
        try {
          const socket = new TcpSocket.Socket();
          let hasResolved = false;
          let connectionTimeout: NodeJS.Timeout | null = null;
          let writeCompleted = false;
          let closeTimeout: NodeJS.Timeout | null = null;
          
          // Connection timeout - 10 seconds
          connectionTimeout = setTimeout(() => {
            if (!hasResolved) {
              hasResolved = true;
              isPrinting = false;
              try {
                socket.destroy();
              } catch {}
              resolve({
                success: false,
                error: 'Kết nối đến máy in timeout. Vui lòng kiểm tra địa chỉ IP và kết nối mạng.',
              });
            }
          }, 10000);
          
          // Cleanup function
          const cleanup = () => {
            isPrinting = false;
            if (connectionTimeout) {
              clearTimeout(connectionTimeout);
              connectionTimeout = null;
            }
            if (closeTimeout) {
              clearTimeout(closeTimeout);
              closeTimeout = null;
            }
          };
          
          socket.on('connect', () => {
            console.log('Connected to printer:', printerIp, port);
            // Clear connection timeout
            if (connectionTimeout) {
              clearTimeout(connectionTimeout);
              connectionTimeout = null;
            }
            
            try {
              // Convert Uint8Array to Buffer if needed
              const buffer = toBuffer(receiptData);
              
              // Mark write as completed immediately after write call
              // The data is sent asynchronously, but we consider it sent once write() is called
              writeCompleted = true;
              
              // Write data to printer
              const writeSuccess = socket.write(buffer);
              console.log('Data written to socket, writeSuccess:', writeSuccess, 'buffer length:', buffer.length);
              
              // If write returns false, buffer is full, wait for drain before considering complete
              if (!writeSuccess) {
                writeCompleted = false;
                console.log('Socket buffer full, waiting for drain...');
                socket.once('drain', () => {
                  console.log('Socket drain event - all data sent');
                  writeCompleted = true;
                  // After drain, data is sent, can resolve after short delay
                  setTimeout(() => {
                    if (!hasResolved) {
                      hasResolved = true;
                      try {
                        socket.end();
                        cleanup();
                        console.log('Print job completed successfully (after drain)');
                        resolve({ success: true });
                      } catch (err) {
                        cleanup();
                        resolve({ success: true });
                      }
                    }
                  }, 500);
                });
              } else {
                // All data written immediately - wait a bit then close
                setTimeout(() => {
                  if (!hasResolved) {
                    hasResolved = true;
                    try {
                      socket.end();
                      cleanup();
                      console.log('Print job completed successfully');
                      resolve({ success: true });
                    } catch (err) {
                      cleanup();
                      resolve({ success: true });
                    }
                  }
                }, 600); // 600ms should be enough for small receipt data
              }
            } catch (writeError) {
              if (!hasResolved) {
                hasResolved = true;
                cleanup();
                console.error('Write error:', writeError);
                try {
                  socket.destroy();
                } catch {}
                resolve({
                  success: false,
                  error: 'Lỗi khi gửi dữ liệu đến máy in.',
                });
              }
            }
          });
          
          socket.on('error', (error: any) => {
            const errorMessage = error?.message || error?.code || '';
            console.error('Socket error:', errorMessage);
            console.error('Attempting to connect to:', printerIp, 'port:', port);
            
            // "Broken pipe" or "ECONNRESET" often means data was sent but connection closed
            // Consider this as success if write was completed
            if ((errorMessage.includes('Broken pipe') || errorMessage.includes('ECONNRESET')) && writeCompleted) {
              if (!hasResolved) {
                hasResolved = true;
                cleanup();
                console.log('Socket closed after data sent (Broken pipe) - treating as success');
                try {
                  socket.destroy();
                } catch {}
                resolve({ success: true });
                return;
              }
            }
            
            if (!hasResolved) {
              hasResolved = true;
              cleanup();
              try {
                socket.destroy();
              } catch {}
              resolve({
                success: false,
                error: errorMessage || `Không thể kết nối đến máy in tại ${printerIp}:${port}. Vui lòng kiểm tra địa chỉ IP và kết nối mạng.`,
              });
            }
          });
          
          socket.on('close', (hadError: boolean) => {
            console.log('Socket closed, hadError:', hadError, 'writeCompleted:', writeCompleted);
            // If socket closed after we connected, consider it success (printer often closes after receiving data)
            // Only treat as error if it closed before we could write
            if (!hasResolved) {
              // Socket closed - if we connected and attempted write, treat as success
              // Printer typically closes connection after processing the print job
              if (writeCompleted || !hadError) {
                hasResolved = true;
                cleanup();
                console.log('Socket closed after write - resolving as success');
                resolve({ success: true });
              } else if (hadError && !writeCompleted) {
                // Error before write completed
                hasResolved = true;
                cleanup();
                resolve({
                  success: false,
                  error: 'Kết nối đến máy in bị đóng trước khi gửi xong dữ liệu.',
                });
              }
            }
            // Always cleanup on close
            if (!hasResolved) {
              cleanup();
            }
          });
          
          // Connect with proper parameters - react-native-tcp-socket uses {port, host} object
          console.log('Connecting to printer:', { host: printerIp, port: port });
          socket.connect({ port, host: printerIp });
          
        } catch (initError: any) {
          isPrinting = false;
          console.error('Socket initialization error:', initError);
          resolve({
            success: false,
            error: initError?.message || 'Không thể khởi tạo kết nối đến máy in.',
          });
        }
      });
    }
    
    // Fallback: Try HTTP printing (some printers support this)
    try {
      // Some printers accept HTTP POST on port 9100 or 631
      const httpUrl = `http://${printerIp}:9100`;
      const response = await fetch(httpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: receiptData,
      } as any);
      
      if (response.ok || response.status === 200) {
        return { success: true };
      }
    } catch (httpError) {
      console.log('HTTP printing not supported:', httpError);
    }
    
    // If no TCP library and HTTP doesn't work
    return {
      success: false,
      error: 'Không tìm thấy thư viện TCP socket. Vui lòng cài đặt: npm install react-native-tcp-socket',
    };
    
  } catch (error: any) {
    console.error('Print error:', error);
    return {
      success: false,
      error: error?.message || 'Không thể kết nối đến máy in. Vui lòng kiểm tra địa chỉ IP và kết nối mạng.',
    };
  }
};

