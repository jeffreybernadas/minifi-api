import * as QRCode from 'qrcode';

export async function generateQRCodeBuffer(url: string): Promise<Buffer> {
  return await QRCode.toBuffer(url, {
    type: 'png',
    width: 300,
    margin: 1,
  });
}
